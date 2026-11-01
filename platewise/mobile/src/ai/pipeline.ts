import type { Food } from '../data/foods';
import type { Candidate, DraftItem, OilLevel } from '../state/types';
import { AUTO_ACCEPT, matchFood } from './matcher';
import { statedGrams } from './portions';
import { GUESS_USE, compose, guessDishes, seenIngredients, type Guess } from './guess';

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
  /** What the food seems to be made of, with each one's rough share of its weight. */
  ingredients?: { name: string; share: number }[];
};

export type MealAnalysis = { is_food: boolean; items?: AnalysisItem[]; notes?: string | null };

const LOW_CONFIDENCE = 0.6;
// Same limits as the server: how far a seen piece may differ from the table's usual piece.
const PIECE_MIN = 0.4;
const PIECE_MAX = 2;
// The on-device model is smaller than the server's, so its ranges start wider.
const MIN_SPREAD_ON_DEVICE = 0.15;
const COUNT_CATEGORIES = ['protein', 'snack', 'drink', 'fruit', 'fast_food'];

const oilFromVisible = (level?: string): OilLevel => (({ none: 'light', low: 'light', medium: 'normal', high: 'very' }) as Record<string, OilLevel>)[level ?? ''] ?? 'normal';

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);

export function buildItem(ai0: AnalysisItem, idx: number, said?: string): DraftItem {
  let ai = ai0;
  const cands = matchFood(ai.food_name, ai.local_aliases ?? [], ai.catalog_id ?? null);
  const top = cands[0];
  let food: Food | undefined = top && top.score >= AUTO_ACCEPT ? top.food : undefined;
  // Not sure what the dish is: guess it from the ingredients seen, or work it out from them.
  let guessed = false;
  let mixed = false;
  let guesses: Guess[] = [];
  if (!food && ai.ingredients?.length) {
    const seen = seenIngredients(ai.ingredients);
    guesses = guessDishes(seen);
    const built = guesses[0]?.score >= GUESS_USE ? null : compose(seen, cap(ai.food_name.trim()) || 'Mixed dish');
    if (guesses[0]?.score >= GUESS_USE) {
      food = guesses[0].food;
      guessed = true;
    } else if (built) {
      food = built;
      mixed = true;
    }
  }
  const [lo0, hi0] = [ai.grams_low, ai.grams_high].sort((a, b) => a - b);
  let lo = lo0;
  let hi = hi0;
  let grams = Math.min(Math.max(ai.grams_estimate, lo), hi);
  // An amount the person stated ("two balls") beats the model's guess: use the table's portion.
  const stated = said && food ? statedGrams(said, food) : null;
  if (stated) {
    grams = stated;
    lo = stated * 0.88;
    hi = stated * 1.12;
    if (food?.countG) ai = { ...ai, count: Math.max(1, Math.round(stated / food.countG)) };
  }

  let kind: DraftItem['kind'] = 'grams';
  let count: number | undefined;
  let pieceG = food?.countG ?? null;
  if (food?.countG && (ai.count || COUNT_CATEGORIES.includes(food.category))) {
    kind = 'count';
    count = Math.max(1, ai.count || Math.round(grams / food.countG));
    if (!stated) {
      // Pieces vary in size: size each from what the model saw, within limits of the usual piece.
      pieceG = Math.round(Math.min(Math.max(grams / count, food.countG * PIECE_MIN), food.countG * PIECE_MAX));
    }
    grams = count * (pieceG as number);
    lo = (count - 0.25) * (pieceG as number);
    hi = (count + 0.25) * (pieceG as number);
  } else if (food?.oily) {
    kind = 'oil';
  }
  const oil = oilFromVisible(ai.visible_oil_level);

  const low = ai.confidence < LOW_CONFIDENCE || !food || guessed || mixed;
  let hint: string;
  if (!food) hint = 'Pick the closest match';
  else if (guessed) hint = `Looks like ${food.name.toLowerCase()} from what we can see. Tap to check`;
  else if (mixed) hint = 'Worked out from its ingredients. Tap to check';
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
    foodId: mixed ? null : food?.id ?? null,
    aiFoodId: mixed ? null : food?.id ?? null,
    aiGrams: Math.round(grams),
    grams: Math.round(grams),
    gramsLow: Math.round(lo),
    gramsHigh: Math.round(hi),
    per100: food?.per100 ?? null,
    uncertainty: Math.min(0.5, Math.max(MIN_SPREAD_ON_DEVICE, spread)),
    confidence: low ? 'low' : 'ok',
    kind,
    count,
    countG: pieceG,
    oil,
    oily: !!food?.oily,
    greens: !!food?.greens,
    candidates: [...guesses.map((g) => g.food), ...cands.map((c) => c.food)]
      .filter((f, i, all) => all.findIndex((x) => x.id === f.id) === i)
      .slice(0, 4)
      .map((f): Candidate => ({ foodId: f.id, name: f.name, detail: f.detail })),
    bbox: ai.bbox && ai.bbox.length === 4 ? ai.bbox : null,
    onDevice: true,
  };
}

export function buildScan(a: MealAnalysis, provider: string, said?: string) {
  const items = a.is_food ? (a.items ?? []).slice(0, 15).map((it, i) => buildItem(it, i, said)) : [];
  return { isFood: a.is_food && items.length > 0, note: a.notes ?? null, provider, items };
}
