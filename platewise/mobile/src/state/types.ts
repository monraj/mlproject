export type Sex = 'female' | 'male';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type OilLevel = 'light' | 'normal' | 'very';
export type ItemKind = 'grams' | 'count' | 'oil';
export type Source = 'photo' | 'voice' | 'text' | 'barcode' | 'search' | 'saved' | 'copy' | 'idea';

export type Per100 = { kcal: number | null; protein: number | null; carbs: number | null; fat: number | null };

/** Conditions that change what PlateWise suggests. Never used for anything else. */
export type Health = { pregnant: boolean; diabetes: boolean; bloodPressure: boolean };

export type Reminders = { on: boolean; breakfast: string; lunch: string; dinner: string; weighDay: number };

export type Profile = {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  goalKg: number;
  activity: number;
  paceKgWeek: number;
  startDate: string;
  startWeightKg: number;
  learnedTdee: number | null;
  hideNumbers: boolean;
  reminders: Reminders;
  health?: Health;
  /** Opt-in: also describe meals as minutes of brisk walking. */
  showWalking?: boolean;
  /** Smartwatch via Health Connect. adjustBudget adds part of measured exercise to the day's budget. */
  watch?: { connected: boolean; adjustBudget: boolean };
};

export type Candidate = { foodId: string; name: string; detail: string };

/** An item on the "Check your plate" screen. Keeps the AI's guess next to the user's value (CLAUDE.md rule 4). */
export type DraftItem = {
  id: string;
  name: string;
  hint?: string;
  foodId: string | null;
  aiFoodId: string | null;
  aiGrams: number;
  grams: number;
  gramsLow: number;
  gramsHigh: number;
  per100: Per100 | null;
  uncertainty: number; // ± share used to show a range, e.g. 0.2 = ±20%
  confidence: 'low' | 'ok';
  kind: ItemKind;
  count?: number;
  countG?: number | null;
  oil: OilLevel;
  oily: boolean;
  greens: boolean;
  candidates: Candidate[];
  bbox?: number[] | null;
  /** Part of a shared bowl that was the person's (1 = all of it). Grams describe the whole dish. */
  portionShare?: number;
  /** Estimated by Gemma on the phone rather than the server. */
  onDevice?: boolean;
};

export type MealItem = {
  name: string;
  foodId: string | null;
  aiFoodId: string | null;
  grams: number;
  aiGrams: number;
  wasCorrected: boolean;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  per100: Per100 | null;
  kind: ItemKind;
  count?: number;
  countG?: number | null;
  oil: OilLevel;
  oily: boolean;
  greens: boolean;
};

export type Meal = {
  id: string;
  type: MealType;
  time: string;
  minute: number;
  title: string;
  kcal: number;
  kcalLow: number;
  kcalHigh: number;
  protein: number;
  carbs: number;
  fat: number;
  greens: number;
  oily: boolean;
  source: Source;
  items: MealItem[];
  swatch: string;
};

/** One day's totals from a smartwatch, via Health Connect. Missing values are null. */
export type WatchDay = {
  steps: number | null;
  activeKcal: number | null;
  totalKcal: number | null;
  distanceM: number | null;
  exerciseMin: number | null;
  sleepMin: number | null;
  restingHr: number | null;
  avgHr: number | null;
  sources: string[];
  syncedAt: string;
};

export type Day = {
  meals: Meal[];
  water: number;
  greensExtra: number;
  steps: number;
  skipped: string[];
  watch?: WatchDay;
  /** Cups of water added from the Pixel Watch app so far (so they're never added twice). */
  watchWater?: number;
};
export type Weight = { date: string; kg: number };
export type SavedMeal = { id: string; name: string; kcal: number; items: MealItem[] };
export type Product = { code: string; name: string; per100: Per100; servingG: number; servingLabel: string; source: string };
export type PlanDay = { kcal: number; reason: string };
export type FlexPlan = { reason: string; days: { date: string; kcal: number }[] };
export type ChatMsg = { id: string; from: 'me' | 'coach'; text: string; plan?: FlexPlan | null; planSaved?: boolean };
export type BudgetChange = { from: number; to: number; date: string; reason: string };
