import type { Day, Meal, Profile, Weight } from './types';
import { dayKcal, macroTargets, trendLine, weeklyRate } from './calc';
import { WEEKDAYS, dayKey, keyDate, shiftKey, shortDate } from '../lib/dates';
import { kcal } from '../lib/format';

export type Tip = { kind: 'good' | 'tip' | 'info'; title: string; body: string };

/** Meal check after saving. Encouraging, never shaming (CLAUDE.md rule 9). */
export function mealTips(meal: Meal, dayProtein: number, proteinGoal: number, greensToday: number, eaten: number, budget: number): Tip[] {
  const tips: Tip[] = [];
  if (meal.protein >= 20) tips.push({ kind: 'good', title: 'Good protein', body: `This meal brought you to ${Math.round((dayProtein / proteinGoal) * 100)}% of today's protein goal.` });
  else if (meal.protein < 10) tips.push({ kind: 'info', title: 'Light on protein', body: 'An egg, fish, beans or chicken at your next meal keeps you fuller for longer.' });
  if (meal.oily) tips.push({ kind: 'tip', title: 'Oil adds up', body: 'We counted the oil in this meal. Asking for less oil on top saves the most.' });
  if (greensToday < 1) tips.push({ kind: 'info', title: 'Low on greens', body: 'Add kontomire, garden eggs, okro or a salad at your next meal for fibre.' });
  else if (meal.greens > 0) tips.push({ kind: 'good', title: 'Greens counted', body: `${greensToday} of 3 servings today.` });
  if (eaten > budget) tips.push({ kind: 'info', title: "Over for today, and that's okay", body: "One day doesn't change your weight. The weekly pattern does." });
  return tips.slice(0, 3);
}

export function todayInsight(greens: number, protein: number, proteinGoal: number, leftKcal: number, mealsToday: number): { text: string; link: string } {
  if (mealsToday === 0) return { text: 'Snap your first meal of the day. It takes about 5 seconds.', link: 'Log' };
  if (greens < 1) return { text: `Greens are low today. Kontomire stew or garden egg stew fixes it`, link: 'Ideas' };
  if (protein < proteinGoal * 0.5 && leftKcal > 400) return { text: 'Protein is under half your goal. Fish, chicken, eggs or beans help', link: 'Ideas' };
  if (leftKcal < 200) return { text: "You're close to today's budget. A light snack or warm drink is plenty", link: 'Ideas' };
  return { text: "You're on track today. Keep logging as you go", link: 'Ideas' };
}

export type WeekStory = {
  label: string;
  meals: number;
  daysLogged: number;
  days: { key: string; letter: string; kcal: number; budget: number; logged: boolean }[];
  topDish: { name: string; n: number } | null;
  bestDay: string | null;
  trend: number | null;
  tip: string;
};

export function weekStory(days: Record<string, Day>, weights: Weight[], budgetFor: (d: string) => number, proteinGoal: number): WeekStory {
  const end = dayKey();
  const keys = Array.from({ length: 7 }, (_, i) => shiftKey(end, i - 6));
  const info = keys.map((k) => {
    const d = days[k];
    return { key: k, letter: WEEKDAYS[keyDate(k).getDay()][0], kcal: dayKcal(d), budget: budgetFor(k), logged: !!d?.meals.length, protein: d?.meals.reduce((s, m) => s + m.protein, 0) ?? 0 };
  });
  const logged = info.filter((d) => d.logged);
  const counts = new Map<string, number>();
  logged.forEach((d) => days[d.key].meals.forEach((m) => m.items.forEach((i) => counts.set(i.name, (counts.get(i.name) ?? 0) + 1))));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const best = [...logged].sort((a, b) => Math.abs(a.kcal - a.budget) - Math.abs(b.kcal - b.budget))[0];
  const over = logged.filter((d) => d.kcal > d.budget * 1.1);
  const weekendOver = over.length > 0 && over.every((d) => [0, 6].includes(keyDate(d.key).getDay()));
  const avgProtein = logged.length ? logged.reduce((s, d) => s + d.protein, 0) / logged.length : 0;
  const tip =
    logged.length === 0 ? 'Log a meal a day next week and your story fills in here.'
    : weekendOver ? 'Your over-budget days were weekends. Plan Saturday dinner on Friday.'
    : over.length >= 3 ? 'Several days went over. Snap before you eat, and ask for less oil on top at chop bars.'
    : avgProtein < proteinGoal * 0.7 ? 'Protein was low most days. Add an egg, fish or beans to one more meal a day.'
    : logged.length < 5 ? 'Logging on more days gives you a truer picture. Try a quick snap at every meal.'
    : 'A steady week. Keep the same rhythm next week.';
  return {
    label: `${shortDate(keys[0])} – ${shortDate(end)}`,
    meals: logged.reduce((s, d) => s + days[d.key].meals.length, 0),
    daysLogged: logged.length,
    days: info,
    topDish: top ? { name: top[0], n: top[1] } : null,
    bestDay: best ? WEEKDAYS[keyDate(best.key).getDay()] : null,
    trend: weeklyRate(weights),
    tip,
  };
}

/** A compact summary of the person's data for the coach. */
export function coachContext(profile: Profile, days: Record<string, Day>, weights: Weight[], budgetFor: (d: string) => number, plansNote: string): string {
  const today = dayKey();
  const lines = Array.from({ length: 7 }, (_, i) => shiftKey(today, i - 6)).map((k) => {
    const d = days[k];
    const label = `${WEEKDAYS[keyDate(k).getDay()]} ${k}`;
    if (!d?.meals.length) return `${label}: nothing logged`;
    const protein = Math.round(d.meals.reduce((s, m) => s + m.protein, 0));
    return `${label}: ${kcal(dayKcal(d))} of ${kcal(budgetFor(k))} kcal, protein ${protein} g; ${d.meals.map((m) => `${m.type}: ${m.title}`).join(' | ')}`;
  });
  const upcoming = Array.from({ length: 10 }, (_, i) => shiftKey(today, i)).map((k) => `${WEEKDAYS[keyDate(k).getDay()]} ${k}`).join(', ');
  const t = trendLine(weights);
  const rate = weeklyRate(weights);
  const targets = macroTargets(budgetFor(today));
  return [
    `Person: ${profile.sex}, ${profile.age} years, ${profile.heightCm} cm, goal ${profile.goalKg} kg, pace ${profile.paceKgWeek} kg a week.`,
    `Daily budget ${kcal(budgetFor(today))} kcal; protein target ${targets.protein} g.`,
    `Weight: ${t.length ? `trend ${t[t.length - 1].trend.toFixed(1)} kg` : `${profile.weightKg} kg at start`}${rate != null ? `, ${rate > 0 ? '+' : ''}${rate.toFixed(2)} kg a week` : ''}.`,
    'Last 7 days:',
    ...lines,
    `Upcoming days: ${upcoming}.`,
    plansNote,
  ].join('\n');
}
