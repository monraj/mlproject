import type { Day, DraftItem, Fasting, FastingPlan, Health, MealItem, OilLevel, Profile, Sex, Weight } from './types';
import { daysBetween, shiftKey } from '../lib/dates';

export type KcalRange = { mid: number; low: number; high: number };
export type Macros = { protein: number; carbs: number; fat: number };

// Same factors as backend/app/nutrition/calc.py.
export const OIL_FACTOR: Record<OilLevel, number> = { light: 0.75, normal: 1, very: 1.4 };
export const KCAL_PER_KG = 7700;

export function itemGrams(item: Pick<DraftItem, 'kind' | 'grams' | 'count' | 'countG' | 'portionShare'>): number {
  const whole = item.kind === 'count' && item.countG ? (item.count ?? 1) * item.countG : item.grams;
  return whole * (item.portionShare ?? 1);
}

function oilFactor(item: Pick<DraftItem, 'oily' | 'oil'>): number {
  return item.oily ? OIL_FACTOR[item.oil] : 1;
}

export function itemKcal(item: DraftItem): KcalRange {
  const kcal100 = item.per100?.kcal;
  if (kcal100 == null) return { mid: 0, low: 0, high: 0 };
  const mid = (itemGrams(item) * kcal100 * oilFactor(item)) / 100;
  const u = item.uncertainty;
  return { mid, low: mid * (1 - u), high: mid * (1 + u) };
}

export function itemMacros(item: DraftItem): Macros {
  const g = itemGrams(item);
  const p = item.per100;
  if (!p) return { protein: 0, carbs: 0, fat: 0 };
  const extraFat = ((oilFactor(item) - 1) * (p.kcal ?? 0)) / 9;
  return { protein: (g * (p.protein ?? 0)) / 100, carbs: (g * (p.carbs ?? 0)) / 100, fat: Math.max(0, (g * ((p.fat ?? 0) + extraFat)) / 100) };
}

export function mealKcal(items: DraftItem[]): KcalRange {
  return items.reduce<KcalRange>(
    (acc, it) => {
      const k = itemKcal(it);
      return { mid: acc.mid + k.mid, low: acc.low + k.low, high: acc.high + k.high };
    },
    { mid: 0, low: 0, high: 0 },
  );
}

export function toMealItem(it: DraftItem): MealItem {
  const k = itemKcal(it);
  const m = itemMacros(it);
  const grams = Math.round(itemGrams(it));
  return {
    name: it.name,
    foodId: it.foodId,
    aiFoodId: it.aiFoodId,
    grams,
    // The AI guessed the whole dish; sharing a bowl isn't a correction of that guess.
    aiGrams: Math.round(it.aiGrams * (it.portionShare ?? 1)),
    wasCorrected: it.foodId !== it.aiFoodId || Math.round(itemGrams({ ...it, portionShare: 1 })) !== it.aiGrams,
    kcal: Math.round(k.mid),
    protein: Math.round(m.protein * 10) / 10,
    carbs: Math.round(m.carbs * 10) / 10,
    fat: Math.round(m.fat * 10) / 10,
    per100: it.per100,
    kind: it.kind,
    count: it.count,
    countG: it.countG,
    oil: it.oil,
    oily: it.oily,
    greens: it.greens,
  };
}

/** Rebuild an editable item from a saved meal item (for "log again"). */
export function fromMealItem(m: MealItem, id: string): DraftItem {
  return {
    id,
    name: m.name,
    hint: 'From your log',
    foodId: m.foodId,
    aiFoodId: m.foodId,
    aiGrams: m.grams,
    grams: m.grams,
    gramsLow: Math.round(m.grams * 0.8),
    gramsHigh: Math.round(m.grams * 1.2),
    per100: m.per100,
    uncertainty: 0.15,
    confidence: 'ok',
    kind: m.kind,
    count: m.count,
    countG: m.countG,
    oil: m.oil,
    oily: m.oily,
    greens: m.greens,
    candidates: [],
  };
}

/** Share of a value against a total, clamped to 0..1. */
export function share(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, value / total));
}

// ---- Safety rules: mirror backend/app/safety/rules.py (CLAUDE.md rule 5) ----

export const CALORIE_FLOOR = { female: 1200, male: 1500 } as const;
export const MIN_AGE = 18;
export const MIN_GOAL_BMI = 18.5;

export function clampBudget(budget: number, sex: Sex): number {
  return Math.max(CALORIE_FLOOR[sex], Math.round(budget / 10) * 10);
}

export function clampPace(pace: number, weightKg: number): number {
  return Math.min(pace, weightKg * 0.01);
}

export function minGoalWeight(heightCm: number): number {
  return MIN_GOAL_BMI * (heightCm / 100) ** 2;
}

export type ProfileInput = Pick<Profile, 'sex' | 'age' | 'heightCm' | 'weightKg' | 'goalKg' | 'activity' | 'paceKgWeek'>;

/** A plain-language problem with the profile, or null when it's fine. */
export function profileProblem(p: ProfileInput): string | null {
  if (!(p.age >= MIN_AGE && p.age <= 100)) return 'PlateWise is for adults 18 and over.';
  if (!(p.heightCm >= 120 && p.heightCm <= 230)) return 'Enter your height in centimetres (120–230).';
  if (!(p.weightKg >= 35 && p.weightKg <= 300)) return 'Enter your weight in kilograms (35–300).';
  if (!(p.goalKg >= 35 && p.goalKg <= 300)) return 'Enter a goal weight in kilograms.';
  const min = minGoalWeight(p.heightCm);
  if (p.goalKg < min) return `${p.goalKg} kg is in the underweight range for your height. Choose ${Math.ceil(min)} kg or more.`;
  return null;
}

/** Already under a healthy BMI: PlateWise only helps gain or hold steady, and suggests professional support. */
export function underweightNow(p: Pick<ProfileInput, 'weightKg' | 'heightCm'>): boolean {
  return p.weightKg < minGoalWeight(p.heightCm);
}

/** Pregnancy and breastfeeding get no calorie deficit (CLAUDE.md rule 5). */
export function safePace(paceKgWeek: number, health?: Health): number {
  return health?.pregnant ? 0 : paceKgWeek;
}

/** Plain-language notes for health conditions, shown in onboarding and passed to the coach. */
export function healthNotes(health?: Health): string[] {
  if (!health) return [];
  const out: string[] = [];
  if (health.pregnant) out.push('Weight loss isn’t recommended while pregnant or breastfeeding, so your budget holds your weight steady. Your midwife or doctor can advise on how much to eat.');
  if (health.diabetes) out.push('With diabetes, changes to food or weight can affect your medication. Check your plan with your doctor or diabetes nurse.');
  if (health.bloodPressure) out.push('With high blood pressure, salt and seasoning cubes matter as much as calories. Keep taking your medication and check changes with your doctor.');
  return out;
}

// Time-restricted eating: mirror the fasting section of backend/app/safety/rules.py.
export const FAST_HOURS: Record<FastingPlan, number> = { '12:12': 12, '14:10': 14, '16:8': 16 };
export const FAST_BREAK_GLUCOSE_MMOL = 3.9;
export const DIABETES_MAX_FAST_HOURS = 12;
export type FastingBlock = 'age' | 'pregnant' | 'eating_disorder' | 'underweight' | 'glucose_meds';

export function fastingBlock(p: Pick<Profile, 'age' | 'weightKg' | 'heightCm' | 'health'>, f: Pick<Fasting, 'eatingDisorder' | 'meds' | 'doctorOk'>): FastingBlock | null {
  if (p.age < MIN_AGE) return 'age';
  if (p.health?.pregnant) return 'pregnant';
  if (f.eatingDisorder) return 'eating_disorder';
  if (p.weightKg < minGoalWeight(p.heightCm)) return 'underweight';
  if (f.meds === 'other' && !f.doctorOk) return 'glucose_meds';
  return null;
}

export function maxFastHours(diabetes: boolean, doctorOk: boolean): number {
  return diabetes && !doctorOk ? DIABETES_MAX_FAST_HOURS : Math.max(...Object.values(FAST_HOURS));
}

export function fastingPlanAllowed(plan: FastingPlan, diabetes: boolean, doctorOk: boolean): boolean {
  return FAST_HOURS[plan] <= maxFastHours(diabetes, doctorOk);
}

export function mustBreakFast(mmol: number): boolean {
  return mmol < FAST_BREAK_GLUCOSE_MMOL;
}

export const FASTING_BLOCK_TEXT: Record<FastingBlock, string> = {
  age: 'PlateWise is for adults 18 and over.',
  pregnant: 'Fasting isn’t advised while pregnant or breastfeeding. Regular meals with protein and greens are the best plan for now.',
  eating_disorder: 'With an eating disorder now or in the past, fasting can bring old patterns back. Regular meals are the kinder plan. A doctor or dietitian can help.',
  underweight: 'Your weight is below the healthy range for your height, so fasting isn’t offered. Regular meals help you get back to a healthy range.',
  glucose_meds: 'Insulin and some diabetes tablets (like glibenclamide or gliclazide) can make blood sugar fall too low while fasting. Ask your doctor first. Once they agree, tick the box below.',
};

/**
 * Days logged in the last 7 (today included). A forgiving measure: one missed day lowers it by one
 * instead of wiping out a streak, which tends to make people give up.
 */
export function weekLogged(days: Record<string, Day>, today: string): number {
  return Array.from({ length: 7 }, (_, i) => days[shiftKey(today, -i)]).filter((d) => !!d?.meals.length).length;
}

/**
 * Extra budget for exercise a watch measured: half of the active calories, up to 500 a day.
 * Watches tend to overestimate calories burned, and eating all of it back often stalls progress;
 * the weight trend still corrects the budget over time.
 */
export const ACTIVITY_SHARE = 0.5;
export const ACTIVITY_CAP = 500;
export function activityBonus(activeKcal: number | null | undefined, enabled: boolean): number {
  if (!enabled || !activeKcal || activeKcal <= 0) return 0;
  return Math.min(ACTIVITY_CAP, Math.round((activeKcal * ACTIVITY_SHARE) / 10) * 10);
}

// ---- Energy: mirror backend/app/energy/bmr.py ----

export function bmr(p: ProfileInput): number {
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
}

export function formulaTdee(p: ProfileInput): number {
  return bmr(p) * p.activity;
}

export function dailyBudget(p: ProfileInput, tdee: number): number {
  const pace = clampPace(p.paceKgWeek, p.weightKg);
  const delta = (pace * KCAL_PER_KG) / 7;
  if (p.goalKg < p.weightKg - 0.1) return clampBudget(tdee - delta, p.sex);
  if (p.goalKg > p.weightKg + 0.1) return clampBudget(tdee + Math.min(delta, 500), p.sex);
  return clampBudget(tdee, p.sex);
}

export function profileTdee(p: Profile): number {
  return p.learnedTdee ?? formulaTdee(p);
}

export function profileBudget(p: Profile): number {
  return dailyBudget({ ...p, paceKgWeek: safePace(p.paceKgWeek, p.health) }, profileTdee(p));
}

export function macroTargets(budget: number): Macros {
  return { protein: Math.round((budget * 0.25) / 4), carbs: Math.round((budget * 0.47) / 4), fat: Math.round((budget * 0.28) / 9) };
}

// ---- Weight trend ----

export type TrendPoint = { date: string; kg: number; trend: number };

/** Exponential moving average with a ~7-day time constant; handles uneven gaps between weigh-ins. */
export function trendLine(weights: Weight[]): TrendPoint[] {
  const sorted = [...weights].sort((a, b) => (a.date < b.date ? -1 : 1));
  const out: TrendPoint[] = [];
  let prev: TrendPoint | null = null;
  for (const w of sorted) {
    if (!prev) prev = { date: w.date, kg: w.kg, trend: w.kg };
    else {
      const dt = Math.max(daysBetween(prev.date, w.date), 0.5);
      const a = 1 - Math.exp(-dt / 7);
      prev = { date: w.date, kg: w.kg, trend: prev.trend + a * (w.kg - prev.trend) };
    }
    out.push(prev);
  }
  return out;
}

/** kg per week over the last ~2 weeks of trend, or null if there isn't enough data. */
export function weeklyRate(weights: Weight[]): number | null {
  const t = trendLine(weights);
  if (t.length < 2) return null;
  const last = t[t.length - 1];
  const ref = t.find((p) => daysBetween(p.date, last.date) <= 14) ?? t[0];
  const span = daysBetween(ref.date, last.date);
  return span >= 5 ? ((last.trend - ref.trend) / span) * 7 : null;
}

export function dayKcal(day: Day | undefined): number {
  return day ? day.meals.reduce((s, m) => s + m.kcal, 0) : 0;
}

export type Learned = { tdee: number; avgIntake: number; span: number; change: number } | { need: string };

/** Back-solve the real daily burn from logged intake and the weight trend (ROADMAP Phase 5). */
export function learnBurn(days: Record<string, Day>, weights: Weight[]): Learned | null {
  const t = trendLine(weights);
  if (t.length < 2) return null;
  const end = t[t.length - 1];
  const start = t.find((p) => daysBetween(p.date, end.date) <= 28) ?? t[0];
  const span = daysBetween(start.date, end.date);
  if (span < 14) return { need: `${14 - span} more day${14 - span === 1 ? '' : 's'} of weigh-ins` };
  let sum = 0;
  let n = 0;
  for (let k = start.date; k <= end.date; k = shiftKey(k, 1)) {
    const kcal = dayKcal(days[k]);
    if (kcal > 0) {
      sum += kcal;
      n += 1;
    }
  }
  if (n < 7) return { need: `${7 - n} more logged day${7 - n === 1 ? '' : 's'}` };
  const change = end.trend - start.trend;
  const tdee = sum / n - (change * KCAL_PER_KG) / span;
  return { tdee: Math.min(Math.max(tdee, 1200), 5000), avgIntake: sum / n, span, change };
}
