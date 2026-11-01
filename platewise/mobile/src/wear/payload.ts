import type { Day, MealItem, SavedMeal, Source } from '../state/types';
import { dayKcal } from '../state/calc';
import { SLOTS, slotOf } from '../lib/mealSlots';
import { shiftKey, weekdayShort } from '../lib/dates';
import { shareOfDay } from '../lib/relate';

// What the phone sends the Pixel Watch app, and how the watch's picks map back to meals. No React
// or storage here, so it's easy to test.

const WATER_GOAL = 8;
const QUICK_MAX = 6;

/** Meals the watch can log again with one tap: saved meals first, then recent ones. */
export function quickMeals(saved: SavedMeal[], days: Record<string, Day>, today: string) {
  const out: { ref: string; title: string; kcal: number }[] = [];
  const titles = new Set<string>();
  for (const m of saved) {
    if (out.length >= 3) break;
    titles.add(m.name.toLowerCase());
    out.push({ ref: `saved:${m.id}`, title: m.name, kcal: Math.round(m.kcal) });
  }
  for (let back = 0; back < 7 && out.length < QUICK_MAX; back++) {
    const date = shiftKey(today, -back);
    for (const m of [...(days[date]?.meals ?? [])].reverse()) {
      const key = m.title.toLowerCase();
      if (out.length >= QUICK_MAX || titles.has(key)) continue;
      titles.add(key);
      out.push({ ref: `meal:${date}:${m.id}`, title: m.title, kcal: Math.round(m.kcal) });
    }
  }
  return out;
}

/** Days in a row with something logged, counting back from today (or yesterday, early in the day). */
export function streak(days: Record<string, Day>, today: string): number {
  let n = 0;
  let date = days[today]?.meals.length ? today : shiftKey(today, -1);
  while (days[date]?.meals.length) {
    n++;
    date = shiftKey(date, -1);
  }
  return n;
}

/** The items a watch reference points to, or null if that meal is gone. */
export function resolveRef(ref: string, saved: SavedMeal[], days: Record<string, Day>): { items: MealItem[]; source: Source } | null {
  const [kind, a, b] = ref.split(':');
  if (kind === 'saved') {
    const m = saved.find((x) => x.id === a);
    return m ? { items: m.items, source: 'saved' } : null;
  }
  if (kind === 'meal') {
    const m = days[a]?.meals.find((x) => x.id === b);
    return m ? { items: m.items, source: 'copy' } : null;
  }
  return null;
}

/** What the watch shows. Kept small: the watch only displays it. */
export function watchPayload(args: {
  date: string;
  budget: number;
  eaten: number;
  protein: number;
  proteinGoal: number;
  water: number;
  hide: boolean;
  meals: { type: Parameters<typeof slotOf>[0]; time: string; title: string; kcal: number }[];
  days?: Record<string, Day>;
  saved?: SavedMeal[];
  budgetFor?: (date: string) => number;
  steps?: number;
}) {
  const left = Math.max(0, Math.round(args.budget - args.eaten));
  const days = args.days ?? {};
  return {
    date: args.date,
    left,
    eaten: Math.round(args.eaten),
    budget: Math.round(args.budget),
    share: shareOfDay(args.eaten, args.budget),
    protein: Math.round(args.protein),
    proteinGoal: args.proteinGoal,
    water: args.water,
    waterGoal: WATER_GOAL,
    steps: args.steps ?? 0,
    hide: args.hide,
    streak: streak(days, args.date),
    slots: SLOTS.map((s) => {
      const ms = args.meals.filter((m) => slotOf(m.type).type === s.type);
      return { label: s.label, kcal: Math.round(ms.reduce((t, m) => t + m.kcal, 0)), titles: ms.map((m) => m.title) };
    }).filter((s) => s.titles.length),
    week: [6, 5, 4, 3, 2, 1, 0].map((back) => {
      const d = shiftKey(args.date, -back);
      return { day: weekdayShort(d).slice(0, 1), kcal: Math.round(back ? dayKcal(days[d]) : args.eaten), budget: Math.round(args.budgetFor?.(d) ?? args.budget) };
    }),
    quick: quickMeals(args.saved ?? [], days, args.date),
  };
}
