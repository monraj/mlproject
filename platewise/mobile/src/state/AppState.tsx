import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BudgetChange, ChatMsg, Day, DraftItem, FlexPlan, Meal, MealItem, MealType, PlanDay, Product, Profile, SavedMeal, Source, Weight } from './types';
import { dayKcal, macroTargets, mealKcal, profileBudget, toMealItem } from './calc';
import { clock, mealForHour } from '../lib/format';
import { dayKey } from '../lib/dates';

const STORAGE_KEY = 'platewise:v1';
const SWATCHES = ['#6E3A2A', '#EADBC4', '#C9502C', '#3E6B2E', '#E08A2E', '#8A4B22', '#B23A1E'];

/** Everything here is saved on the phone. */
type Saved = {
  profile: Profile | null;
  days: Record<string, Day>;
  weights: Weight[];
  saved: SavedMeal[];
  products: Record<string, Product>;
  plans: Record<string, PlanDay>;
  chat: ChatMsg[];
  budgetChange: BudgetChange | null;
  launchedOnce: boolean;
};

type State = Saved & {
  hydrated: boolean;
  draft: DraftItem[];
  draftSource: Source;
  draftNote: string | null;
  photoUri: string | null;
  lastSavedId: string | null;
  eatenBefore: number;
};

type Action =
  | { type: 'hydrate'; saved: Partial<Saved> | null }
  | { type: 'launched' }
  | { type: 'setProfile'; profile: Profile }
  | { type: 'patchProfile'; patch: Partial<Profile> }
  | { type: 'startDraft'; items: DraftItem[]; source: Source; photoUri?: string | null; note?: string | null }
  | { type: 'updateItem'; id: string; patch: Partial<DraftItem> }
  | { type: 'removeItem'; id: string }
  | { type: 'addItem'; item: DraftItem }
  | { type: 'saveDraft'; mealType?: MealType; favourite?: string }
  | { type: 'logMeals'; meals: Meal[] }
  | { type: 'deleteMeal'; date: string; id: string }
  | { type: 'habit'; date: string; key: 'water' | 'greensExtra' | 'steps'; value: number }
  | { type: 'skip'; what: string }
  | { type: 'addWeight'; weight: Weight }
  | { type: 'deleteWeight'; date: string }
  | { type: 'setLearnedTdee'; tdee: number | null; reason: string }
  | { type: 'setPlans'; plan: FlexPlan }
  | { type: 'maintenanceWeek'; kcal: number }
  | { type: 'clearPlans' }
  | { type: 'saveProduct'; product: Product }
  | { type: 'deleteSaved'; id: string }
  | { type: 'chat'; msg: ChatMsg }
  | { type: 'chatPatch'; id: string; patch: Partial<ChatMsg> }
  | { type: 'chatClear' }
  | { type: 'reset' };

const emptyDay = (): Day => ({ meals: [], water: 0, greensExtra: 0, steps: 0, skipped: [] });

const initialSaved: Saved = {
  profile: null,
  days: {},
  weights: [],
  saved: [],
  products: {},
  plans: {},
  chat: [],
  budgetChange: null,
  launchedOnce: false,
};

const initial: State = {
  ...initialSaved,
  hydrated: false,
  draft: [],
  draftSource: 'photo',
  draftNote: null,
  photoUri: null,
  lastSavedId: null,
  eatenBefore: 0,
};

function withDay(s: State, date: string, fn: (d: Day) => Day): State {
  return { ...s, days: { ...s.days, [date]: fn(s.days[date] ?? emptyDay()) } };
}

export function newId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function buildMeal(items: MealItem[], source: Source, type?: MealType): Meal {
  const now = new Date();
  const kcal = items.reduce((s, i) => s + i.kcal, 0);
  const sum = (k: 'protein' | 'carbs' | 'fat') => Math.round(items.reduce((s, i) => s + i[k], 0) * 10) / 10;
  const seed = (items[0]?.foodId ?? items[0]?.name ?? 'x').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
  return {
    id: newId('m'),
    type: type ?? mealForHour(now.getHours()),
    time: clock(now),
    minute: now.getHours() * 60 + now.getMinutes(),
    title: items.map((i) => i.name).join(', '),
    kcal: Math.round(kcal),
    kcalLow: Math.round(kcal * 0.8),
    kcalHigh: Math.round(kcal * 1.2),
    protein: sum('protein'),
    carbs: sum('carbs'),
    fat: sum('fat'),
    greens: items.filter((i) => i.greens).length,
    oily: items.some((i) => i.oily),
    source,
    items,
    swatch: SWATCHES[seed % SWATCHES.length],
  };
}

function reducer(s: State, a: Action): State {
  const today = dayKey();
  switch (a.type) {
    case 'hydrate':
      return { ...s, ...initialSaved, ...(a.saved ?? {}), hydrated: true };
    case 'launched':
      return { ...s, launchedOnce: true };
    case 'setProfile':
      return { ...s, profile: a.profile };
    case 'patchProfile':
      return s.profile ? { ...s, profile: { ...s.profile, ...a.patch } } : s;
    case 'startDraft':
      return { ...s, draft: a.items.map((i) => ({ ...i })), draftSource: a.source, photoUri: a.photoUri ?? null, draftNote: a.note ?? null };
    case 'updateItem':
      return { ...s, draft: s.draft.map((i) => (i.id === a.id ? { ...i, ...a.patch } : i)) };
    case 'removeItem':
      return { ...s, draft: s.draft.filter((i) => i.id !== a.id) };
    case 'addItem':
      return { ...s, draft: [...s.draft, a.item] };
    case 'saveDraft': {
      const items = s.draft.filter((i) => i.per100?.kcal != null).map(toMealItem);
      if (!items.length) return s;
      const meal = buildMeal(items, s.draftSource, a.mealType);
      const before = dayKcal(s.days[today]);
      const next = withDay(s, today, (d) => ({ ...d, meals: [...d.meals, meal] }));
      const saved = a.favourite ? [{ id: newId('s'), name: a.favourite, kcal: meal.kcal, items }, ...s.saved].slice(0, 50) : s.saved;
      return { ...next, saved, draft: [], photoUri: null, draftNote: null, lastSavedId: meal.id, eatenBefore: before };
    }
    case 'logMeals': {
      if (!a.meals.length) return s;
      const before = dayKcal(s.days[today]);
      const next = withDay(s, today, (d) => ({ ...d, meals: [...d.meals, ...a.meals] }));
      return { ...next, lastSavedId: a.meals[a.meals.length - 1].id, eatenBefore: before };
    }
    case 'deleteMeal':
      return withDay(s, a.date, (d) => ({ ...d, meals: d.meals.filter((m) => m.id !== a.id) }));
    case 'habit':
      return withDay(s, a.date, (d) => ({ ...d, [a.key]: Math.max(0, a.value) }));
    case 'skip':
      return withDay(s, today, (d) => ({ ...d, skipped: [...d.skipped, a.what] }));
    case 'addWeight': {
      const weights = [...s.weights.filter((w) => w.date !== a.weight.date), a.weight].sort((x, y) => (x.date < y.date ? -1 : 1));
      return { ...s, weights };
    }
    case 'deleteWeight':
      return { ...s, weights: s.weights.filter((w) => w.date !== a.date) };
    case 'setLearnedTdee': {
      if (!s.profile) return s;
      const from = profileBudget(s.profile);
      const profile = { ...s.profile, learnedTdee: a.tdee };
      return { ...s, profile, budgetChange: { from, to: profileBudget(profile), date: today, reason: a.reason } };
    }
    case 'setPlans': {
      const plans = { ...s.plans };
      for (const d of a.plan.days) plans[d.date] = { kcal: d.kcal, reason: a.plan.reason };
      return { ...s, plans };
    }
    case 'maintenanceWeek': {
      const plans = { ...s.plans };
      const d = new Date();
      for (let i = 0; i < 7; i++) {
        plans[dayKey(d)] = { kcal: a.kcal, reason: 'Maintenance week' };
        d.setDate(d.getDate() + 1);
      }
      return { ...s, plans };
    }
    case 'clearPlans':
      return { ...s, plans: {} };
    case 'saveProduct':
      return { ...s, products: { ...s.products, [a.product.code]: a.product } };
    case 'deleteSaved':
      return { ...s, saved: s.saved.filter((m) => m.id !== a.id) };
    case 'chat':
      return { ...s, chat: [...s.chat, a.msg].slice(-40) };
    case 'chatPatch':
      return { ...s, chat: s.chat.map((m) => (m.id === a.id ? { ...m, ...a.patch } : m)) };
    case 'chatClear':
      return { ...s, chat: [] };
    case 'reset':
      return { ...initial, hydrated: true, launchedOnce: true };
    default:
      return s;
  }
}

export type Ctx = {
  s: State;
  dispatch: React.Dispatch<Action>;
  today: string;
  day: Day;
  budget: number;
  budgetFor: (date: string) => number;
  eatenKcal: number;
  leftKcal: number;
  protein: number;
  proteinGoal: number;
  greens: number;
  daysLogged: number;
};

const AppContext = createContext<Ctx | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [s, dispatch] = useReducer(reducer, initial);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => dispatch({ type: 'hydrate', saved: raw ? (JSON.parse(raw) as Partial<Saved>) : null }))
      .catch(() => dispatch({ type: 'hydrate', saved: null }));
  }, []);

  useEffect(() => {
    if (!s.hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const saved: Saved = {
        profile: s.profile,
        days: s.days,
        weights: s.weights,
        saved: s.saved,
        products: s.products,
        plans: s.plans,
        chat: s.chat,
        budgetChange: s.budgetChange,
        launchedOnce: s.launchedOnce,
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved)).catch(() => undefined);
    }, 250);
  }, [s]);

  const value = useMemo<Ctx>(() => {
    const today = dayKey();
    const day = s.days[today] ?? emptyDay();
    const base = s.profile ? profileBudget(s.profile) : 2000;
    const floor = s.profile?.sex === 'male' ? 1500 : 1200;
    const budgetFor = (date: string) => (s.plans[date] ? Math.max(floor, s.plans[date].kcal) : base);
    const budget = budgetFor(today);
    const eatenKcal = dayKcal(day);
    return {
      s,
      dispatch,
      today,
      day,
      budget,
      budgetFor,
      eatenKcal,
      leftKcal: Math.max(0, budget - eatenKcal),
      protein: Math.round(day.meals.reduce((sum, m) => sum + m.protein, 0)),
      proteinGoal: macroTargets(budget).protein,
      greens: day.meals.reduce((n, m) => n + m.greens, 0) + day.greensExtra,
      daysLogged: Object.values(s.days).filter((d) => d.meals.length > 0).length,
    };
  }, [s]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const v = useContext(AppContext);
  if (!v) throw new Error('useApp must be used inside AppStateProvider');
  return v;
}

export function draftTotal(items: DraftItem[]) {
  return mealKcal(items);
}
