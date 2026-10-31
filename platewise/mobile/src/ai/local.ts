import * as ImageManipulator from 'expo-image-manipulator';
import type { Idea, ProductInfo, ScanResult } from '../api/client';
import { food as foodById } from '../data/foods';
import { CALORIE_FLOOR, OIL_FACTOR } from '../state/calc';
import type { FlexPlan } from '../state/types';
import { dayKey, daysBetween } from '../lib/dates';
import { GemmaError, generateJson } from './gemma';
import { buildScan, type MealAnalysis } from './pipeline';
import { LABEL_PROMPT, coachSystem, ideasPrompt, photoPrompt, scanSystem, textPrompt } from './prompts';
import { COACH_SCHEMA, IDEAS_SCHEMA, LABEL_SCHEMA, MEAL_SCHEMA } from './schemas';

// The same five jobs the server does, run by Gemma on the phone. As on the server, the model only
// names foods and gram ranges; calories come from the food table (CLAUDE.md rule 1).

const PROVIDER = 'gemma-on-device';
// Smaller photos read just as well here and are much faster on a phone's processor.
const PHOTO_WIDTH = 768;

/** Re-encoding drops EXIF/GPS (CLAUDE.md rule 6) and shrinks the photo. */
async function preparePhoto(uri: string): Promise<string> {
  const out = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: PHOTO_WIDTH } }], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });
  return out.uri;
}

export async function scanPhoto(uri: string, meal: string, note?: string): Promise<ScanResult> {
  const analysis = await generateJson<MealAnalysis>({
    system: scanSystem(),
    turns: [{ role: 'user', content: photoPrompt(meal, note) }],
    schema: MEAL_SCHEMA,
    imageUri: await preparePhoto(uri),
  });
  return buildScan(analysis, PROVIDER);
}

export async function parseText(text: string, lang: 'en' | 'tw' | 'pcm', _meal: string): Promise<ScanResult> {
  const analysis = await generateJson<MealAnalysis>({ system: scanSystem(), turns: [{ role: 'user', content: textPrompt(text, lang) }], schema: MEAL_SCHEMA });
  return buildScan(analysis, PROVIDER);
}

export async function coach(
  messages: { role: 'user' | 'assistant'; content: string }[],
  context: string,
  sex: string,
  hideNumbers: boolean,
): Promise<{ reply: string; flex_plan: FlexPlan | null }> {
  const floor = CALORIE_FLOOR[sex === 'male' ? 'male' : 'female'];
  const ans = await generateJson<{ reply: string; flex_plan: { reason: string; days: { date: string; kcal: number }[] } | null }>({
    system: coachSystem(context, floor, hideNumbers),
    turns: messages.slice(-12),
    schema: COACH_SCHEMA,
    maxTokens: 600,
  });
  let plan: FlexPlan | null = null;
  if (ans.flex_plan) {
    const today = dayKey();
    const days = ans.flex_plan.days
      .slice(0, 10)
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date) && daysBetween(today, d.date) >= 0 && daysBetween(today, d.date) <= 21)
      .map((d) => ({ date: d.date, kcal: Math.max(floor, Math.round(d.kcal / 10) * 10) })); // the safety floor always wins
    if (days.length) plan = { reason: ans.flex_plan.reason.slice(0, 80), days };
  }
  return { reply: ans.reply, flex_plan: plan };
}

export async function ideas(req: { kcal_left: number; protein_left: number; greens_today: number; meal: string; category: string }): Promise<{ ideas: Idea[]; tip: string }> {
  const parsed = await generateJson<{ ideas: { name: string; detail: string; badge: string; category: Idea['category']; items: { catalog_id: string; grams: number }[] }[]; tip: string }>({
    system: 'You plan realistic Ghanaian meals from a food catalogue.',
    turns: [{ role: 'user', content: ideasPrompt(req.kcal_left, req.protein_left, req.greens_today, req.meal, req.category) }],
    schema: IDEAS_SCHEMA,
    maxTokens: 900,
  });
  const out: Idea[] = [];
  parsed.ideas.slice(0, 4).forEach((idea, n) => {
    const portions = idea.items
      .map((it) => ({ f: foodById(it.catalog_id), g: Math.max(5, Math.min(it.grams, 2000)) }))
      .filter((p): p is { f: NonNullable<ReturnType<typeof foodById>>; g: number } => !!p.f && p.f.per100.kcal != null);
    const total = portions.reduce((s, p) => s + (p.f.per100.kcal ?? 0) * (p.g / 100), 0);
    // Models often overshoot; shrink every portion so the meal fits what's left.
    const scale = total ? Math.min(1, (req.kcal_left * 0.95) / total) : 1;
    let kcal = 0;
    let protein = 0;
    const items = portions.map(({ f, g: g0 }) => {
      const g = Math.max(5, Math.round((g0 * scale) / 5) * 5);
      const factor = f.oily ? OIL_FACTOR.normal : 1;
      kcal += ((f.per100.kcal ?? 0) * g * factor) / 100;
      protein += ((f.per100.protein ?? 0) * g) / 100;
      return { food_id: f.id, name: f.name, grams: Math.round(g) };
    });
    if (items.length) out.push({ id: `idea${n}`, name: idea.name, detail: idea.detail, badge: idea.badge, category: idea.category, kcal: Math.round(kcal), protein: Math.round(protein), items });
  });
  return { ideas: out, tip: parsed.tip };
}

export async function productLabel(uri: string): Promise<ProductInfo> {
  const r = await generateJson<{
    found: boolean;
    barcode: string | null;
    name: string | null;
    kcal_per_100g: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
    serving_g: number | null;
    serving_label: string | null;
    from_label: boolean;
  }>({
    system: 'You read food packaging accurately.',
    turns: [{ role: 'user', content: LABEL_PROMPT }],
    schema: LABEL_SCHEMA,
    imageUri: await preparePhoto(uri),
    maxTokens: 400,
  });
  if (!r.found) throw new GemmaError("That doesn't look like a food package.");
  const code = (r.barcode ?? '').replace(/\D/g, '');
  return {
    barcode: code || null,
    name: r.name || 'Product',
    per100: { kcal: r.kcal_per_100g, protein: r.protein_g, carbs: r.carbs_g, fat: r.fat_g },
    serving_g: r.serving_g,
    serving_label: r.serving_label || '1 serving',
    source: r.from_label ? 'label:photo' : 'label:unread',
  };
}
