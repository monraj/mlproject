import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BudgetChange, ChatMsg, Day, DraftItem, FlexPlan, Glucose, StressCheck, Meal, MealItem, MealType, PlanDay, Product, Profile, SavedMeal, Source, WatchDay, Weight } from './types';
import { activityBonus, dayKcal, macroTargets, mealKcal, personalTarget, toMealItem, weekLogged, type TargetBasis } from './calc';
import { clock, mealForHour } from '../lib/format';
import { dayKey } from '../lib/dates';
import { clockOf, minuteFor } from '../lib/mealSlots';
import { addNotes, toNotes, type MemoryNote } from './memory';

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
  /** What the coach remembers from older chats (see memory.ts). */
  memory: MemoryNote[];
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
  | { type: 'restoreMeal'; date: string; meal: Meal }
  | { type: 'habit'; date: string; key: 'water' | 'greensExtra' | 'steps'; value: number }
  | { type: 'skip'; what: string }
  | { type: 'addWeight'; weight: Weight }
  | { type: 'watchSync'; days: Record<string, WatchDay>; weights: Weight[] }
  | { type: 'watchWater'; date: string; cups: number }
  | { type: 'widgetWater'; date: string; cups: number }
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
  | { type: 'forgetMemory' }
  | { type: 'addGlucose'; date: string; reading: Glucose }
  | { type: 'deleteGlucose'; date: string; id: string }
  | { type: 'stressCheck'; date: string; check: StressCheck }
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
  memory: [],
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
  // A meal filed under an earlier part of the day gets that part's usual time.
  const minute = type ? minuteFor(type, now) : now.getHours() * 60 + now.getMinutes();
  const kcal = items.reduce((s, i) => s + i.kcal, 0);
  const sum = (k: 'protein' | 'carbs' | 'fat') => Math.round(items.reduce((s, i) => s + i[k], 0) * 10) / 10;
  const seed = (items[0]?.foodId ?? items[0]?.name ?? 'x').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
  return {
    id: newId('m'),
    type: type ?? mealForHour(now.getHours()),
    time: clockOf(minute),
    minute,
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
    case 'restoreMeal':
      // Undo a delete: put the meal back where it was in the day.
      return withDay(s, a.date, (d) => (d.meals.some((m) => m.id === a.meal.id) ? d : { ...d, meals: [...d.meals, a.meal].sort((x, y) => x.minute - y.minute) }));
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
    case 'watchWater':
      // The watch reports its running count for the day; add only cups not added before.
      return withDay(s, a.date, (d) => {
        const added = Math.max(0, a.cups - (d.watchWater ?? 0));
        return added ? { ...d, water: d.water + added, watchWater: a.cups } : d;
      });
    case 'widgetWater':
      // Same for the home-screen widget's "+ Water" button.
      return withDay(s, a.date, (d) => {
        const added = Math.max(0, a.cups - (d.widgetWater ?? 0));
        return added ? { ...d, water: d.water + added, widgetWater: a.cups } : d;
      });
    case 'watchSync': {
      // Watch steps fill the steps habit (never lowering a higher manual entry); a weigh-in the
      // person typed for a day wins over the scale's.
      let next = s;
      for (const [date, watch] of Object.entries(a.days)) {
        next = withDay(next, date, (d) => ({ ...d, watch, steps: Math.max(d.steps, watch.steps ?? 0) }));
      }
      const have = new Set(next.weights.map((w) => w.date));
      const added = a.weights.filter((w) => !have.has(w.date));
      if (!added.length) return next;
      return { ...next, weights: [...next.weights, ...added].sort((x, y) => (x.date < y.date ? -1 : 1)) };
    }
    case 'addGlucose':
      return withDay(s, a.date, (d) => ({ ...d, glucose: [...(d.glucose ?? []), a.reading].sort((x, y) => (x.at < y.at ? -1 : 1)) }));
    case 'deleteGlucose':
      return withDay(s, a.date, (d) => ({ ...d, glucose: (d.glucose ?? []).filter((g) => g.id !== a.id) }));
    case 'stressCheck':
      // The same moment from the phone and the watch counts once.
      return withDay(s, a.date, (d) => (d.stress?.some((x) => x.at === a.check.at) ? d : { ...d, stress: [...(d.stress ?? []), a.check] }));
    case 'setLearnedTdee': {
      if (!s.profile) return s;
      const from = personalTarget(s.profile, s.weights, s.days, today).kcal;
      const profile = { ...s.profile, learnedTdee: a.tdee };
      return { ...s, profile, budgetChange: { from, to: personalTarget(profile, s.weights, s.days, today).kcal, date: today, reason: a.reason } };
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
    case 'chat': {
      // Messages that scroll out of the chat are kept in the coach's memory.
      const chat = [...s.chat, a.msg];
      const drop = Math.max(0, chat.length - 40);
      const cut = drop && chat[drop]?.from === 'coach' ? drop + 1 : drop; // never split a question from its answer
      return cut ? { ...s, chat: chat.slice(cut), memory: addNotes(s.memory, toNotes(chat.slice(0, cut))) } : { ...s, chat };
    }
    case 'chatPatch':
      return { ...s, chat: s.chat.map((m) => (m.id === a.id ? { ...m, ...a.patch } : m)) };
    case 'chatClear':
      return { ...s, chat: [], memory: addNotes(s.memory, toNotes(s.chat)) };
    case 'forgetMemory':
      return { ...s, memory: [] };
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
  /** The usual daily target and what it's based on (before planned days and exercise). */
  target: number;
  targetBasis: TargetBasis | null;
  /** Extra kcal added to today's budget for exercise the watch measured (0 when off). */
  activityBonus: number;
  eatenKcal: number;
  leftKcal: number;
  protein: number;
  proteinGoal: number;
  greens: number;
  daysLogged: number;
  weekLogged: number;
};

const AppContext = createContext<Ctx | null>(null);

/** One person's log. `storageKey` is theirs (see accounts.ts); remount it with a `key` to switch people. */
export function AppStateProvider({ storageKey, children }: { storageKey: string; children: React.ReactNode }) {
  const [s, dispatch] = useReducer(reducer, initial);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((raw) => dispatch({ type: 'hydrate', saved: raw ? (JSON.parse(raw) as Partial<Saved>) : null }))
      .catch(() => dispatch({ type: 'hydrate', saved: null }));
  }, [storageKey]);

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
        memory: s.memory,
        budgetChange: s.budgetChange,
        launchedOnce: s.launchedOnce,
      };
      AsyncStorage.setItem(storageKey, JSON.stringify(saved)).catch(() => undefined);
    }, 250);
  }, [s, storageKey]);

  const value = useMemo<Ctx>(() => {
    const today = dayKey();
    const day = s.days[today] ?? emptyDay();
    const personal = s.profile ? personalTarget(s.profile, s.weights, s.days, today) : null;
    const base = personal?.kcal ?? 2000;
    const floor = s.profile?.sex === 'male' ? 1500 : 1200;
    // When the target already comes from measured steps, adding exercise on top would count it twice.
    const adjust = !!s.profile?.watch?.adjustBudget && personal?.basis.steps == null;
    const bonusFor = (date: string) => activityBonus(s.days[date]?.watch?.activeKcal, adjust);
    const budgetFor = (date: string) => (s.plans[date] ? Math.max(floor, s.plans[date].kcal) : base) + bonusFor(date);
    const budget = budgetFor(today);
    const eatenKcal = dayKcal(day);
    return {
      s,
      dispatch,
      today,
      day,
      budget,
      budgetFor,
      target: base,
      targetBasis: personal?.basis ?? null,
      activityBonus: bonusFor(today),
      eatenKcal,
      leftKcal: Math.max(0, budget - eatenKcal),
      protein: Math.round(day.meals.reduce((sum, m) => sum + m.protein, 0)),
      proteinGoal: macroTargets(budget).protein,
      greens: day.meals.reduce((n, m) => n + m.greens, 0) + day.greensExtra,
      daysLogged: Object.values(s.days).filter((d) => d.meals.length > 0).length,
      weekLogged: weekLogged(s.days, dayKey()),
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
