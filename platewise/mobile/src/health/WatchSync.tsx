import { useEffect, useRef } from 'react';
import { AppState as RNAppState, Platform } from 'react-native';
import { useApp } from '../state/AppState';
import { dayKey, shiftKey } from '../lib/dates';
import type { WatchDay } from '../state/types';
import { grantedTypes, readWatchDay, readWatchWeights } from './watch';

const EVERY_MS = 10 * 60 * 1000;
const DAYS = 7;
const WEIGHT_DAYS = 30;

/** Pulls the last week of smartwatch data whenever the app opens or comes back to the front. */
export function WatchSync() {
  const { s, dispatch } = useApp();
  const connected = !!s.profile?.watch?.connected;
  const last = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'android' || !s.hydrated || !connected) return;
    const sync = async (force = false) => {
      if (!force && Date.now() - last.current < EVERY_MS) return;
      last.current = Date.now();
      await syncNow(dispatch);
    };
    sync(true).catch(() => undefined);
    const sub = RNAppState.addEventListener('change', (state) => {
      if (state === 'active') sync().catch(() => undefined);
    });
    return () => sub.remove();
  }, [s.hydrated, connected, dispatch]);

  return null;
}

/** For the connect button: sync straight after permissions are granted. */
export async function syncNow(dispatch: ReturnType<typeof useApp>['dispatch']): Promise<void> {
  const granted = await grantedTypes();
  if (!granted.length) return;
  const today = dayKey();
  const days: Record<string, WatchDay> = {};
  for (let i = 0; i < DAYS; i++) days[shiftKey(today, -i)] = await readWatchDay(shiftKey(today, -i), granted);
  dispatch({ type: 'watchSync', days, weights: await readWatchWeights(shiftKey(today, -WEIGHT_DAYS), granted) });
}
