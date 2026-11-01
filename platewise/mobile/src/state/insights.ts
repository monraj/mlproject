import type { Day, Meal, Profile, WatchDay, Weight } from './types';
import { CALORIE_FLOOR, dayKcal, healthNotes, macroTargets, minGoalWeight, trendLine, weeklyRate } from './calc';
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
  if (mealsToday === 0) return { text: 'Snap your first meal of the day. It takes about 5 seconds', link: 'Log' };
  if (greens < 1) return { text: `Greens are low today. Kontomire stew or garden egg stew fixes it`, link: 'Ideas' };
  if (protein < proteinGoal * 0.5 && leftKcal > 400) return { text: 'Protein is under half your goal. Fish, chicken, eggs or beans help', link: 'Ideas' };
  if (leftKcal < 200) return { text: "You're close to today's target. A light snack or warm drink is plenty", link: 'Ideas' };
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
    : weekendOver ? 'Your days over target were weekends. Plan Saturday dinner on Friday.'
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
/** "; watch: 8,200 steps, 310 kcal active, 35 min exercise, slept 6 h 40 min, resting heart 62" */
export function watchSummary(w: WatchDay | undefined): string {
  if (!w) return '';
  const parts = [
    w.steps != null ? `${kcal(w.steps)} steps` : null,
    w.activeKcal != null ? `${kcal(w.activeKcal)} kcal active` : null,
    w.exerciseMin ? `${w.exerciseMin} min exercise` : null,
    w.sleepMin ? `slept ${Math.floor(w.sleepMin / 60)} h ${w.sleepMin % 60} min` : null,
    w.restingHr ? `resting heart ${w.restingHr}` : null,
  ].filter(Boolean);
  return parts.length ? `; watch: ${parts.join(', ')}` : '';
}

export function coachContext(profile: Profile, days: Record<string, Day>, weights: Weight[], budgetFor: (d: string) => number, plansNote: string): string {
  const today = dayKey();
  const lines = Array.from({ length: 7 }, (_, i) => shiftKey(today, i - 6)).map((k) => {
    const d = days[k];
    const label = `${WEEKDAYS[keyDate(k).getDay()]} ${k}`;
    const watch = watchSummary(d?.watch);
    if (!d?.meals.length) return `${label}: nothing logged${watch}`;
    const protein = Math.round(d.meals.reduce((s, m) => s + m.protein, 0));
    return `${label}: ${kcal(dayKcal(d))} of ${kcal(budgetFor(k))} kcal, protein ${protein} g; ${d.meals.map((m) => `${m.type}: ${m.title}`).join(' | ')}${watch}`;
  });
  const upcoming = Array.from({ length: 10 }, (_, i) => shiftKey(today, i)).map((k) => `${WEEKDAYS[keyDate(k).getDay()]} ${k}`).join(', ');
  const t = trendLine(weights);
  const rate = weeklyRate(weights);
  const targets = macroTargets(budgetFor(today));
  return [
    `Person: ${profile.sex}, ${profile.age} years, ${profile.heightCm} cm, goal ${profile.goalKg} kg, pace ${profile.paceKgWeek} kg a week.`,
    `Daily calorie target ${kcal(budgetFor(today))} kcal; protein target ${targets.protein} g.`,
    ...healthNotes(profile.health).map((n) => `Health note: ${n}`),
    `Weight: ${t.length ? `trend ${t[t.length - 1].trend.toFixed(1)} kg` : `${profile.weightKg} kg at start`}${rate != null ? `, ${rate > 0 ? '+' : ''}${rate.toFixed(2)} kg a week` : ''}.`,
    'Last 7 days:',
    ...lines,
    `Upcoming days: ${upcoming}.`,
    plansNote,
  ].join('\n');
}

/**
 * Gentle check for patterns linked to under-eating or unsafe loss. Never blocks anything and never
 * mentions numbers; it suggests support instead (CLAUDE.md rules 5 and 9).
 */
export function wellbeingCheck(profile: Profile, days: Record<string, Day>, weights: Weight[], today = dayKey()): string | null {
  const floor = CALORIE_FLOOR[profile.sex];
  const recent = Array.from({ length: 7 }, (_, i) => days[shiftKey(today, -i - 1)]).filter((d): d is Day => !!d?.meals.length);
  const veryLow = recent.filter((d) => dayKcal(d) < floor * 0.8).length;
  const rate = weeklyRate(weights);
  const t = trendLine(weights);
  const now = t.length ? t[t.length - 1].trend : profile.weightKg;
  const underweight = now < minGoalWeight(profile.heightCm);

  if (underweight && rate != null && rate < 0) {
    return 'Your weight is now below the healthy range for your height. Please talk to a doctor or someone you trust. You can set your goal to hold steady in Me → Goal and pace.';
  }
  if (veryLow >= 3) {
    return 'Several recent days were very low. Eating too little can leave you tired and makes weight harder to manage, so your daily target is there to be eaten. If food or weight is worrying you, please talk to a doctor or someone you trust.';
  }
  if (rate != null && rate < -0.015 * now) {
    return 'You’re losing faster than is usually safe. Slower loss is easier to keep off. Try eating closer to your daily target, and talk to a doctor if this continues.';
  }
  return null;
}
