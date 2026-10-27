export type Sex = 'female' | 'male';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type OilLevel = 'light' | 'normal' | 'very';
export type ItemKind = 'grams' | 'count' | 'oil';
export type Source = 'photo' | 'voice' | 'text' | 'barcode' | 'search' | 'saved' | 'copy' | 'idea';

export type Per100 = { kcal: number | null; protein: number | null; carbs: number | null; fat: number | null };

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

export type Day = { meals: Meal[]; water: number; greensExtra: number; steps: number; skipped: string[] };
export type Weight = { date: string; kg: number };
export type SavedMeal = { id: string; name: string; kcal: number; items: MealItem[] };
export type Product = { code: string; name: string; per100: Per100; servingG: number; servingLabel: string; source: string };
export type PlanDay = { kcal: number; reason: string };
export type FlexPlan = { reason: string; days: { date: string; kcal: number }[] };
export type ChatMsg = { id: string; from: 'me' | 'coach'; text: string; plan?: FlexPlan | null; planSaved?: boolean };
export type BudgetChange = { from: number; to: number; date: string; reason: string };
