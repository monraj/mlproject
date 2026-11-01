import { FOODS, type Food } from '../data/foods';
import { matchFood } from './matcher';

// Port of backend/app/nutrition/guess.py: when a scan can't name a dish, guess it from the
// ingredients the model saw, or work out a value from those ingredients. Numbers come from the table.

const INGREDIENT_MATCH = 0.7;
const PREFER = 0.25;
const GUESS_MIN = 0.5;
const GUESS_SHARED = 2;
export const GUESS_USE = 0.7;

export type Seen = { food: Food; share: number };
export type Guess = { food: Food; score: number; shared: string[] };

const USED = new Set(FOODS.flatMap((f) => f.ingredients ?? []));

// Rare ingredients say more about a dish than tomato or palm oil, which are in dozens.
const WEIGHTS: Map<string, number> = (() => {
  const dishes = FOODS.filter((f) => f.ingredients?.length);
  const df = new Map<string, number>();
  dishes.forEach((f) => new Set(f.ingredients).forEach((i) => df.set(i, (df.get(i) ?? 0) + 1)));
  return new Map([...df].map(([i, n]) => [i, Math.log(1 + dishes.length / n)]));
})();
const weight = (ids: Iterable<string>) => [...ids].reduce((s, i) => s + (WEIGHTS.get(i) ?? 1), 0);

export function seenIngredients(items: { name: string; share: number }[]): Seen[] {
  const out = new Map<string, Seen>();
  for (const { name, share } of items.slice(0, 8)) {
    const cands = matchFood(name, [], null, 6).filter((c) => c.score >= INGREDIENT_MATCH);
    if (!cands.length) continue;
    const near = cands.filter((c) => c.score >= cands[0].score - PREFER);
    const f = (near.find((c) => c.food.category === 'ingredient' || USED.has(c.food.id)) ?? cands[0]).food;
    out.set(f.id, { food: f, share: (out.get(f.id)?.share ?? 0) + Math.max(0, Math.min(1, share)) });
  }
  return [...out.values()];
}

export function guessDishes(seen: Seen[], limit = 3): Guess[] {
  const ids = new Set(seen.map((s) => s.food.id));
  if (ids.size < GUESS_SHARED) return [];
  const out: Guess[] = [];
  for (const f of FOODS) {
    const dish = new Set(f.ingredients ?? []);
    if (dish.size < GUESS_SHARED || f.category === 'ingredient') continue;
    const shared = [...ids].filter((i) => dish.has(i));
    if (shared.length < GUESS_SHARED) continue;
    const score = (2 * weight(shared)) / (weight(ids) + weight(dish));
    if (score >= GUESS_MIN) out.push({ food: f, score: Math.round(score * 1000) / 1000, shared: shared.sort() });
  }
  return out.sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name)).slice(0, limit);
}

/** A one-off food whose per-100 g values are the share-weighted mix of its ingredients. */
export function compose(seen: Seen[], name: string): Food | null {
  const usable = seen.filter((s) => s.food.per100.kcal != null && s.share > 0);
  const total = usable.reduce((t, s) => t + s.share, 0);
  if (usable.length < 2 || total <= 0) return null;
  const mix = (k: 'kcal' | 'protein' | 'carbs' | 'fat') => Math.round((usable.reduce((t, s) => t + (s.food.per100[k] ?? 0) * s.share, 0) / total) * 10) / 10;
  return {
    id: 'mix',
    name,
    aliases: [],
    category: 'mixed',
    detail: `Worked out from its ingredients: ${usable.map((s) => s.food.name.split(' (')[0].toLowerCase()).join(', ')}`,
    per100: { kcal: mix('kcal'), protein: mix('protein'), carbs: mix('carbs'), fat: mix('fat') },
    portionG: 200,
    portionLabel: '1 portion',
    countG: null,
    oily: usable.some((s) => s.food.oily),
    greens: usable.some((s) => s.food.greens),
    confidence: 'estimate',
    people: [],
    ingredients: usable.map((s) => s.food.id),
  };
}
