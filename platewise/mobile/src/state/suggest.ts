import type { Day, Profile, Weight } from './types';
import { ironFriendly, needsFor } from './needs';
import { dayKcal } from './calc';
import { PLATES, type MealPlate, type Slot } from '../data/meals';
import { food } from '../data/foods';
import { glucoseBand, readingsOf } from './vitals';
import { shiftKey } from '../lib/dates';

// Meal suggestions from everyday Ghanaian plates, sized to fit what's left of the day. Pure and
// deterministic, so they change once a day (and on "Show others") and can be tested.

export type Suggestion = { plate: MealPlate; slot: Slot; parts: { foodId: string; grams: number }[]; kcal: number; protein: number; carbs: number; why: string };

// A day's budget split across the three meals.
const SHARE: Record<Slot, number> = { Breakfast: 0.25, Lunch: 0.4, Dinner: 0.35 };
const SCALE = [0.6, 1.4] as const;
const VARIETY_DAYS = 3;
// A cup of koko or a mug of tea is one cup: drinks and porridges are never stretched to fill a plate.
const CUP_CATEGORIES = ['drink', 'porridge'];
const CUP_MAX = 1.15;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

function totals(parts: { foodId: string; grams: number }[]) {
  return parts.reduce(
    (t, p) => {
      const f = food(p.foodId);
      const per = f?.per100;
      return {
        kcal: t.kcal + ((per?.kcal ?? 0) * p.grams) / 100,
        protein: t.protein + ((per?.protein ?? 0) * p.grams) / 100,
        carbs: t.carbs + ((per?.carbs ?? 0) * p.grams) / 100,
        greens: t.greens || !!f?.greens,
      };
    },
    { kcal: 0, protein: 0, carbs: 0, greens: false },
  );
}

export type SuggestInput = { profile: Profile; days: Record<string, Day>; weights?: Weight[]; date: string; budget: number; proteinGoal: number; slot: Slot; shuffle?: number; limit?: number };

/** The kcal a meal in `slot` should come to, given what's eaten so far today. */
export function slotTarget(budget: number, eaten: number, slot: Slot): number {
  const later = (['Breakfast', 'Lunch', 'Dinner'] as Slot[]).slice((['Breakfast', 'Lunch', 'Dinner'] as Slot[]).indexOf(slot));
  const left = Math.max(0, budget - eaten);
  const share = SHARE[slot] / later.reduce((t, s) => t + SHARE[s], 0);
  return Math.round(Math.min(left * share, budget * SHARE[slot] * 1.2));
}

export function suggestMeals({ profile, days, weights = [], date, budget, proteinGoal: budgetProtein, slot, shuffle = 0, limit = 3 }: SuggestInput): Suggestion[] {
  const today = days[date];
  // Age, height, weight and today's Health Connect data steer which plates come first.
  const needs = needsFor(profile, today, weights, slot === 'Dinner');
  const proteinGoal = Math.max(budgetProtein, needs.proteinG);
  const eaten = dayKcal(today);
  const target = slotTarget(budget, eaten, slot);
  if (target < 150) return [];
  const proteinSoFar = today?.meals.reduce((t, m) => t + m.protein, 0) ?? 0;
  const greensSoFar = (today?.meals.reduce((t, m) => t + m.greens, 0) ?? 0) + (today?.greensExtra ?? 0);
  // Diabetes, or a high reading today: favour plates lighter on starch.
  const sugarCare = !!profile.health?.diabetes || readingsOf(today).some((g) => ['above', 'high'].includes(glucoseBand(g.mmol, g.when)));
  const recent = new Set<string>();
  for (let i = 1; i <= VARIETY_DAYS; i++) days[shiftKey(date, -i)]?.meals.forEach((m) => m.items.forEach((it) => it.foodId && recent.add(it.foodId)));
  today?.meals.forEach((m) => m.items.forEach((it) => it.foodId && recent.add(it.foodId)));

  const scored = PLATES.filter((p) => p.slots.includes(slot) && p.parts.every(([id]) => food(id)?.per100.kcal != null)).map((plate) => {
    const base = totals(plate.parts.map(([foodId, grams]) => ({ foodId, grams })));
    const k = Math.min(SCALE[1], Math.max(needs.fuller ? 0.9 : SCALE[0], target / Math.max(1, base.kcal)));
    const parts = plate.parts.map(([foodId, grams]) => {
      const kp = CUP_CATEGORIES.includes(food(foodId)?.category ?? '') ? Math.min(k, CUP_MAX) : k;
      return { foodId, grams: Math.max(10, Math.round((grams * kp) / 10) * 10) };
    });
    const t = totals(parts);
    // Breakfast can be light: coming in under the target counts much less against a plate.
    const gap = (t.kcal - target) / target;
    const fit = 1 - Math.min(1, slot === 'Breakfast' && gap < 0 ? -gap * 0.4 : Math.abs(gap));
    const proteinNeed = Math.max(0, proteinGoal * (slot === 'Dinner' ? 1 : 0.7) - proteinSoFar);
    const protein = Math.min(1, t.protein / Math.max(10, proteinNeed * 0.6));
    // Breakfast in Ghana is usually a cup: tea, koko, oblayo, Milo with bread. Lean towards those,
    // and don't let the extra pull of greens drag heavy lunch plates into the morning.
    const cup = slot === 'Breakfast' && plate.parts.some(([id]) => CUP_CATEGORIES.includes(food(id)?.category ?? '')) ? 0.45 : 0;
    const greens = greensSoFar < 3 && t.greens ? 0.3 * (slot === 'Breakfast' ? 1 : needs.greensWeight) : 0;
    const carbShare = t.kcal ? (t.carbs * 4) / t.kcal : 0;
    const sugar = sugarCare ? -Math.max(0, carbShare - 0.5) * 1.5 : 0;
    const starch = needs.starch === 'lighter' ? -Math.max(0, carbShare - 0.55) * 0.8 : needs.starch === 'more' ? Math.max(0, carbShare - 0.45) * 0.3 : 0;
    const repeat = plate.parts.some(([id]) => recent.has(id) && food(id)?.category !== 'sauce') ? -0.35 : 0;
    // A little daily variety, the same all day; "Show others" moves it along.
    const daily = hash(`${date}:${shuffle}:${plate.id}`) * 0.45;
    const iron = needs.iron && ironFriendly(plate.parts.map(([id]) => id), t.greens) ? 0.25 : 0;
    const score = fit * 1.2 + protein * 0.6 * needs.proteinWeight + greens + cup + sugar + starch + iron + repeat + daily;
    // The person's own reason, when the plate actually answers it.
    const personal =
      needs.reason &&
      ((needs.proteinWeight > 1 && protein >= 1) || (needs.greensWeight > 1 && greens > 0) || (needs.starch === 'lighter' && carbShare < 0.55) || (needs.starch === 'more' && fit > 0.8) || (needs.reason === 'Greens and beans for iron' && iron > 0))
        ? needs.reason
        : null;
    const why =
      sugarCare && carbShare < 0.5 ? 'Lighter on starch, kinder to blood sugar'
      : personal ? personal
      : slot === 'Breakfast' && t.kcal < target * 0.8 ? 'A light start to the day'
      : greens ? 'Adds greens to your day'
      : protein >= 1 ? 'Good protein'
      : fit > 0.9 ? 'Fits what you have left'
      : 'A change from recent meals';
    return { plate, slot, parts, kcal: Math.round(t.kcal), protein: Math.round(t.protein), carbs: Math.round(t.carbs), why, score };
  });
  // Keep variety across the list: one plate per main dish.
  const seen = new Set<string>();
  return scored
    .sort((a, b) => b.score - a.score)
    .filter((s) => (seen.has(s.plate.parts[0][0]) ? false : (seen.add(s.plate.parts[0][0]), true)))
    .slice(0, limit)
    .map(({ score: _score, ...s }) => s);
}

/** Which meal to suggest next, from the time and what's already logged today. */
export function nextSlot(day: Day | undefined, now = new Date()): Slot {
  const h = now.getHours();
  const had = new Set(day?.meals.map((m) => m.type) ?? []);
  if (h < 11 && !had.has('Breakfast')) return 'Breakfast';
  if (h < 16 && !had.has('Lunch')) return 'Lunch';
  return 'Dinner';
}
