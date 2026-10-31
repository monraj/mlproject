import type { Food } from '../data/foods';
import type { Candidate, DraftItem, OilLevel } from '../state/types';
import { AUTO_ACCEPT, matchFood } from './matcher';

// Port of backend/app/vision/pipeline.py: the model names foods and gram ranges; this code matches
// them to the food table. Calories are computed later by state/calc.ts, never by the model.

export type AnalysisItem = {
  food_name: string;
  catalog_id?: string | null;
  local_aliases?: string[];
  grams_estimate: number;
  grams_low: number;
  grams_high: number;
  count?: number | null;
  visible_oil_level?: 'none' | 'low' | 'medium' | 'high' | 'unknown';
  confidence: number;
  bbox?: number[] | null;
};

export type MealAnalysis = { is_food: boolean; items?: AnalysisItem[]; notes?: string | null };

const LOW_CONFIDENCE = 0.6;
// The on-device model is smaller than the server's, so its ranges start wider.
const MIN_SPREAD_ON_DEVICE = 0.15;
const COUNT_CATEGORIES = ['protein', 'snack', 'drink', 'fruit', 'fast_food'];

const oilFromVisible = (level?: string): OilLevel => (({ none: 'light', low: 'light', medium: 'normal', high: 'very' }) as Record<string, OilLevel>)[level ?? ''] ?? 'normal';

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);

export function buildItem(ai: AnalysisItem, idx: number): DraftItem {
  const cands = matchFood(ai.food_name, ai.local_aliases ?? [], ai.catalog_id ?? null);
  const top = cands[0];
  const food: Food | undefined = top && top.score >= AUTO_ACCEPT ? top.food : undefined;
  const [lo0, hi0] = [ai.grams_low, ai.grams_high].sort((a, b) => a - b);
  let lo = lo0;
  let hi = hi0;
  let grams = Math.min(Math.max(ai.grams_estimate, lo), hi);

  let kind: DraftItem['kind'] = 'grams';
  let count: number | undefined;
  if (food?.countG && (ai.count || COUNT_CATEGORIES.includes(food.category))) {
    kind = 'count';
    count = Math.max(1, ai.count || Math.round(grams / food.countG));
    grams = count * food.countG;
    lo = (count - 0.25) * food.countG;
    hi = (count + 0.25) * food.countG;
  } else if (food?.oily) {
    kind = 'oil';
  }
  const oil = oilFromVisible(ai.visible_oil_level);

  const low = ai.confidence < LOW_CONFIDENCE || !food;
  let hint: string;
  if (!food) hint = 'Pick the closest match';
  else if (low) hint = `Is this ${food.name.toLowerCase()}? Tap to check`;
  else if (kind === 'oil') hint = 'How oily was it?';
  else if (kind === 'count') {
    const unit = food.portionLabel.split(' ').slice(1).join(' ') || 'piece';
    hint = `${count} ${unit}${count && count > 1 && !unit.endsWith('s') ? 's' : ''}`;
  } else hint = 'Looks right';

  const spread = grams > 0 ? (hi - lo) / (2 * grams) : 0.25;
  return {
    id: `i${idx}-${Date.now().toString(36)}`,
    name: food ? food.name : cap(ai.food_name.trim()),
    hint,
    foodId: food?.id ?? null,
    aiFoodId: food?.id ?? null,
    aiGrams: Math.round(grams),
    grams: Math.round(grams),
    gramsLow: Math.round(lo),
    gramsHigh: Math.round(hi),
    per100: food?.per100 ?? null,
    uncertainty: Math.min(0.5, Math.max(MIN_SPREAD_ON_DEVICE, spread)),
    confidence: low ? 'low' : 'ok',
    kind,
    count,
    countG: food?.countG ?? null,
    oil,
    oily: !!food?.oily,
    greens: !!food?.greens,
    candidates: cands.slice(0, 3).map((c): Candidate => ({ foodId: c.food.id, name: c.food.name, detail: c.food.detail })),
    bbox: ai.bbox && ai.bbox.length === 4 ? ai.bbox : null,
    onDevice: true,
  };
}

export function buildScan(a: MealAnalysis, provider: string) {
  const items = a.is_food ? (a.items ?? []).slice(0, 15).map(buildItem) : [];
  return { isFood: a.is_food && items.length > 0, note: a.notes ?? null, provider, items };
}
