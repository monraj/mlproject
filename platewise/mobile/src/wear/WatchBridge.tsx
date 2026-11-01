import { useEffect, useRef } from 'react';
import { AppState as RNAppState } from 'react-native';
import { WearSync } from '../../modules/wear-sync';
import { buildMeal, useApp } from '../state/AppState';
import { dayKey } from '../lib/dates';
import { resolveRef, watchPayload } from './payload';

/** Keeps the Pixel Watch app in step with today, and adds water and meals tapped on the watch. */
export function WatchBridge() {
  const { s, day, today, budget, budgetFor, eatenKcal, protein, proteinGoal, dispatch } = useApp();

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
      days: s.days,
      saved: s.saved,
      budgetFor,
      steps: day.watch?.steps ?? day.steps,
    });
    const t = setTimeout(() => WearSync?.sendToday(JSON.stringify(payload)).catch(() => undefined), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.hydrated, s.profile, s.days, s.saved, today, budget, eatenKcal, protein, proteinGoal, day.water]);

  // Watch -> phone: cups added on the watch (a running count per day; the reducer adds the new
  // ones) and meals picked on the watch (each added once, then removed from the Data Layer).
  const latest = useRef({ saved: s.saved, days: s.days });
  latest.current = { saved: s.saved, days: s.days };
  useEffect(() => {
    if (!WearSync || !s.hydrated) return;
    let busy = false;
    const pull = async () => {
      if (busy) return;
      busy = true;
      try {
        const date = dayKey();
        const cups = await WearSync!.watchWater(date);
        if (cups > 0) dispatch({ type: 'watchWater', date, cups });
        for (const log of await WearSync!.pendingLogs()) {
          const found = resolveRef(log.ref, latest.current.saved, latest.current.days);
          if (found) dispatch({ type: 'logMeals', meals: [buildMeal(found.items, found.source)] });
          await WearSync!.clearLog(log.uri);
        }
      } finally {
        busy = false;
      }
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
