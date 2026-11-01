import { Platform } from 'react-native';
import {
  SdkAvailabilityStatus,
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  readRecords,
  requestPermission,
} from 'react-native-health-connect';
import type { Glucose, GlucoseWhen, WatchDay, Weight } from '../state/types';
import { dayKey, keyDate, shiftKey } from '../lib/dates';

// Smartwatch data through Android's Health Connect, where Samsung Health, Fitbit / Pixel Watch and
// most other watch apps share their data. Read-only; nothing is written back. Stays on the phone.

const READ = ['Steps', 'ActiveCaloriesBurned', 'TotalCaloriesBurned', 'Distance', 'ExerciseSession', 'HeartRate', 'RestingHeartRate', 'SleepSession', 'Weight', 'BloodGlucose', 'HeartRateVariabilityRmssd'] as const;
type ReadType = (typeof READ)[number];

export type WatchStatus = 'unsupported' | 'unavailable' | 'needs_update' | 'ready';

export async function watchStatus(): Promise<WatchStatus> {
  if (Platform.OS !== 'android') return 'unsupported';
  try {
    const s = await getSdkStatus();
    if (s === SdkAvailabilityStatus.SDK_AVAILABLE) return 'ready';
    if (s === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'needs_update';
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/** Asks the person which data to share. Returns the record types they allowed. */
export async function connectWatch(): Promise<ReadType[]> {
  if (!(await initialize())) return [];
  const granted = await requestPermission(READ.map((recordType) => ({ accessType: 'read' as const, recordType })));
  return granted.filter((p) => p.accessType === 'read').map((p) => p.recordType as ReadType);
}

export async function grantedTypes(): Promise<ReadType[]> {
  try {
    if (!(await initialize())) return [];
    return (await getGrantedPermissions()).filter((p) => p.accessType === 'read').map((p) => p.recordType as ReadType);
  } catch {
    return [];
  }
}

export const openWatchSettings = () => openHealthConnectSettings();

const between = (from: Date, to: Date) => ({ operator: 'between' as const, startTime: from.toISOString(), endTime: to.toISOString() });

async function tryAggregate<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch {
    return null; // not granted or no data
  }
}

/** One local day's totals. Sleep counts the night that ended that morning (6 pm the day before to noon). */
export async function readWatchDay(key: string, granted: ReadType[]): Promise<WatchDay> {
  const start = keyDate(key);
  start.setHours(0, 0, 0, 0);
  const end = keyDate(shiftKey(key, 1));
  end.setHours(0, 0, 0, 0);
  const now = new Date();
  const to = end > now ? now : end;
  const day = between(start, to);
  const nightFrom = new Date(start.getTime() - 6 * 3600 * 1000);
  const nightTo = new Date(start.getTime() + 12 * 3600 * 1000);
  const has = (t: ReadType) => granted.includes(t);
  const sources = new Set<string>();
  const note = (r: { dataOrigins?: string[] } | null) => r?.dataOrigins?.forEach((o) => sources.add(o));

  const [steps, active, total, dist, exercise, sleep, resting, hr] = await Promise.all([
    has('Steps') ? tryAggregate(() => aggregateRecord({ recordType: 'Steps', timeRangeFilter: day })) : null,
    has('ActiveCaloriesBurned') ? tryAggregate(() => aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter: day })) : null,
    has('TotalCaloriesBurned') ? tryAggregate(() => aggregateRecord({ recordType: 'TotalCaloriesBurned', timeRangeFilter: day })) : null,
    has('Distance') ? tryAggregate(() => aggregateRecord({ recordType: 'Distance', timeRangeFilter: day })) : null,
    has('ExerciseSession') ? tryAggregate(() => aggregateRecord({ recordType: 'ExerciseSession', timeRangeFilter: day })) : null,
    has('SleepSession') ? tryAggregate(() => aggregateRecord({ recordType: 'SleepSession', timeRangeFilter: between(nightFrom, nightTo > now ? now : nightTo) })) : null,
    has('RestingHeartRate') ? tryAggregate(() => aggregateRecord({ recordType: 'RestingHeartRate', timeRangeFilter: day })) : null,
    has('HeartRate') ? tryAggregate(() => aggregateRecord({ recordType: 'HeartRate', timeRangeFilter: day })) : null,
  ]);
  [steps, active, total, dist, exercise, sleep, resting, hr].forEach((r) => note(r as { dataOrigins?: string[] } | null));

  const [hrv, sugar] = await Promise.all([has('HeartRateVariabilityRmssd') ? readHrv(day) : null, has('BloodGlucose') ? readGlucose(day) : []]);

  const pos = (n: number | undefined | null) => (n != null && n > 0 ? Math.round(n) : null);
  return {
    steps: pos(steps?.COUNT_TOTAL),
    activeKcal: pos(active?.ACTIVE_CALORIES_TOTAL?.inKilocalories),
    totalKcal: pos(total?.ENERGY_TOTAL?.inKilocalories),
    distanceM: pos(dist?.DISTANCE?.inMeters),
    exerciseMin: pos(exercise?.EXERCISE_DURATION_TOTAL?.inSeconds != null ? exercise.EXERCISE_DURATION_TOTAL.inSeconds / 60 : null),
    sleepMin: pos(sleep?.SLEEP_DURATION_TOTAL != null ? sleep.SLEEP_DURATION_TOTAL / 60 : null),
    restingHr: pos(resting?.BPM_AVG),
    avgHr: pos(hr?.BPM_AVG),
    minHr: pos(hr?.BPM_MIN),
    maxHr: pos(hr?.BPM_MAX),
    hrvMs: hrv,
    glucose: sugar,
    sources: [...sources].filter((s) => s !== 'app.platewise.mobile'),
    syncedAt: new Date().toISOString(),
  };
}

/** Weigh-ins from a smart scale or watch app, one per day (the latest that day). */
export async function readWatchWeights(sinceKey: string, granted: ReadType[]): Promise<Weight[]> {
  if (!granted.includes('Weight')) return [];
  try {
    const res = await readRecords('Weight', { timeRangeFilter: between(keyDate(sinceKey), new Date()) });
    const byDay = new Map<string, { at: string; kg: number }>();
    for (const r of res.records) {
      const k = dayKey(new Date(r.time));
      const kg = Math.round(r.weight.inKilograms * 10) / 10;
      const prev = byDay.get(k);
      if (!prev || r.time > prev.at) byDay.set(k, { at: r.time, kg });
    }
    return [...byDay.entries()].map(([date, v]) => ({ date, kg: v.kg }));
  } catch {
    return [];
  }
}

type Range = ReturnType<typeof between>;

/** The day's average HRV (RMSSD). Health Connect can't sum these, so read them and average. */
async function readHrv(range: Range): Promise<number | null> {
  try {
    const res = await readRecords('HeartRateVariabilityRmssd', { timeRangeFilter: range });
    const ms = res.records.map((r) => r.heartRateVariabilityMillis).filter((n) => n > 0 && n < 300);
    return ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) : null;
  } catch {
    return null;
  }
}

// Health Connect's relationToMeal: 2 fasting, 3 before a meal, 4 after a meal; anything else is "random".
const RELATION: Record<number, GlucoseWhen> = { 2: 'fasting', 3: 'before', 4: 'after' };

async function readGlucose(range: Range): Promise<Glucose[]> {
  try {
    const res = await readRecords('BloodGlucose', { timeRangeFilter: range });
    return res.records
      .filter((r) => r.level.inMillimolesPerLiter > 0)
      .map((r) => ({ id: `hc${r.metadata?.id ?? r.time}`, at: r.time, mmol: Math.round(r.level.inMillimolesPerLiter * 10) / 10, when: RELATION[r.relationToMeal] ?? 'random', source: 'watch' as const }));
  } catch {
    return [];
  }
}
