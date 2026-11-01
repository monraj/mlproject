import { useEffect } from 'react';
import { AppState as RNAppState } from 'react-native';
import { WearSync } from '../../modules/wear-sync';
import { useApp } from '../state/AppState';
import { SLOTS, slotOf } from '../lib/mealSlots';
import { dayKey } from '../lib/dates';
import { shareOfDay } from '../lib/relate';

const WATER_GOAL = 8;

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
}) {
  const left = Math.max(0, Math.round(args.budget - args.eaten));
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
    hide: args.hide,
    slots: SLOTS.map((s) => {
      const ms = args.meals.filter((m) => slotOf(m.type).type === s.type);
      return { label: s.label, kcal: Math.round(ms.reduce((t, m) => t + m.kcal, 0)), titles: ms.map((m) => m.title) };
    }).filter((s) => s.titles.length),
  };
}

/** Keeps the Pixel Watch app in step with today, and adds water tapped on the watch. */
export function WatchBridge() {
  const { s, day, today, budget, eatenKcal, protein, proteinGoal, dispatch } = useApp();

  // Phone -> watch: send today's summary whenever it changes (debounced).
  useEffect(() => {
    if (!WearSync || !s.hydrated || !s.profile) return;
    const payload = watchPayload({
      date: today,
      budget,
      eaten: eatenKcal,
      protein,
      proteinGoal,
      water: day.water,
      hide: !!s.profile.hideNumbers,
      meals: day.meals,
    });
    const t = setTimeout(() => WearSync?.sendToday(JSON.stringify(payload)).catch(() => undefined), 800);
    return () => clearTimeout(t);
  }, [s.hydrated, s.profile, today, budget, eatenKcal, protein, proteinGoal, day.water, day.meals]);

  // Watch -> phone: cups added on the watch (a running count per day; the reducer adds the new ones).
  useEffect(() => {
    if (!WearSync || !s.hydrated) return;
    const pull = async () => {
      const date = dayKey();
      const cups = await WearSync!.watchWater(date);
      if (cups > 0) dispatch({ type: 'watchWater', date, cups });
    };
    pull().catch(() => undefined);
    const sub = WearSync.addListener('onWatchData', () => pull().catch(() => undefined));
    const app = RNAppState.addEventListener('change', (st) => st === 'active' && pull().catch(() => undefined));
    return () => {
      sub.remove();
      app.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.hydrated]);

  return null;
}
