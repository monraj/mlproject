import type { Day, Glucose, GlucoseWhen, StressCheck, WatchDay } from './types';
import { shiftKey } from '../lib/dates';

// Blood sugar, heart and stress from the watch and what the person types in. Pure, so it's tested.
// These describe readings; they never diagnose. Anything outside the usual range says to talk to a
// health worker, and a low reading says what to do right now.

// mmol/L bands from WHO and American Diabetes Association guidance:
// fasting 3.9–5.5 usual, 5.6–6.9 above usual, 7.0+ high; 2 h after a meal under 7.8 usual,
// 7.8–11.0 above usual, 11.1+ high; any reading under 3.9 is low and under 3.0 very low.
export const GLUCOSE = { veryLow: 3.0, low: 3.9, fastingUsual: 5.5, fastingHigh: 7.0, afterUsual: 7.8, afterHigh: 11.1 } as const;

export type GlucoseBand = 'very_low' | 'low' | 'usual' | 'above' | 'high';

export function glucoseBand(mmol: number, when: GlucoseWhen): GlucoseBand {
  if (mmol < GLUCOSE.veryLow) return 'very_low';
  if (mmol < GLUCOSE.low) return 'low';
  if (when === 'fasting' || when === 'before') {
    if (mmol <= GLUCOSE.fastingUsual) return 'usual';
    return mmol < GLUCOSE.fastingHigh ? 'above' : 'high';
  }
  if (mmol < GLUCOSE.afterUsual) return 'usual';
  return mmol < GLUCOSE.afterHigh ? 'above' : 'high';
}

export const WHEN_LABEL: Record<GlucoseWhen, string> = { fasting: 'Fasting', before: 'Before a meal', after: 'After a meal', random: 'Any time' };

/** What a reading means, in plain words. `urgent` readings need action now, not later. */
export function glucoseAdvice(g: Pick<Glucose, 'mmol' | 'when'>): { band: GlucoseBand; text: string; urgent: boolean } {
  const band = glucoseBand(g.mmol, g.when);
  switch (band) {
    case 'very_low':
      return { band, urgent: true, text: 'Very low. Take something sugary now (half a glass of juice, a soft drink or 3 teaspoons of sugar in water), recheck in 15 minutes, and get help if you feel faint or confused.' };
    case 'low':
      return { band, urgent: true, text: 'Low. Take something sugary now, recheck in 15 minutes, then eat a small meal. Tell your doctor if this keeps happening.' };
    case 'usual':
      return { band, urgent: false, text: 'In the usual range.' };
    case 'above':
      return { band, urgent: false, text: 'A little above the usual range. A walk after meals and smaller portions of rice, gari or fufu often help. Mention it at your next check-up.' };
    case 'high':
      return { band, urgent: false, text: 'Above the usual range. If readings stay this high, see a doctor or nurse soon; only a lab test can say what it means.' };
  }
}

/** Typed-in readings and the meter's, oldest first, without duplicates. */
export function readingsOf(day: Day | undefined): Glucose[] {
  if (!day) return [];
  const all = [...(day.glucose ?? []), ...(day.watch?.glucose ?? [])];
  const seen = new Set<string>();
  return all.filter((g) => (seen.has(g.id) ? false : (seen.add(g.id), true))).sort((a, b) => (a.at < b.at ? -1 : 1));
}

export function parseMmol(text: string, unit: 'mmol' | 'mgdl'): number | null {
  const n = Number(text.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  const mmol = unit === 'mgdl' ? n / 18 : n;
  return mmol >= 1 && mmol <= 35 ? Math.round(mmol * 10) / 10 : null;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};

export type StressRead = { level: 'calm' | 'usual' | 'raised'; reasons: string[]; checkIn: StressCheck | null; hasSignals: boolean };

const BASELINE_DAYS = 14;
const MIN_BASELINE = 3;

/**
 * A rough read of stress for one day: the watch's heart rate variability and resting heart rate
 * compared with the person's own last two weeks, last night's sleep, and their own check-in.
 * The check-in wins: how someone says they feel matters more than any sensor.
 */
export function stressRead(days: Record<string, Day>, date: string): StressRead | null {
  const d = days[date];
  const w: WatchDay | undefined = d?.watch;
  const past = Array.from({ length: BASELINE_DAYS }, (_, i) => days[shiftKey(date, -i - 1)]?.watch).filter(Boolean) as WatchDay[];
  const hrvBase = median(past.map((x) => x.hrvMs ?? 0).filter((n) => n > 0));
  const hrBase = median(past.map((x) => x.restingHr ?? 0).filter((n) => n > 0));
  const hrvCount = past.filter((x) => (x.hrvMs ?? 0) > 0).length;
  const hrCount = past.filter((x) => (x.restingHr ?? 0) > 0).length;
  const checkIn = [...(d?.stress ?? [])].sort((a, b) => (a.at < b.at ? 1 : -1))[0] ?? null;

  const reasons: string[] = [];
  let up = 0;
  let calm = 0;
  if (w?.hrvMs && hrvBase && hrvCount >= MIN_BASELINE) {
    if (w.hrvMs < hrvBase * 0.8) {
      up++;
      reasons.push('heart rate variability is lower than your usual');
    } else if (w.hrvMs > hrvBase * 1.1) calm++;
  }
  if (w?.restingHr && hrBase && hrCount >= MIN_BASELINE) {
    if (w.restingHr >= hrBase + 5) {
      up++;
      reasons.push(`resting heart rate is ${w.restingHr - hrBase} bpm above your usual`);
    } else if (w.restingHr <= hrBase - 2) calm++;
  }
  if (w?.sleepMin != null && w.sleepMin > 0 && w.sleepMin < 6 * 60) {
    up++;
    reasons.push('short sleep last night');
  }
  const hasSignals = reasons.length > 0 || calm > 0;
  if (!checkIn && !hasSignals) return null;

  let level: StressRead['level'] = up >= 2 ? 'raised' : calm >= 1 && up === 0 ? 'calm' : 'usual';
  if (checkIn) {
    if (checkIn.level >= 4) level = 'raised';
    else if (checkIn.level <= 2 && up < 2) level = 'calm';
    else if (level === 'calm') level = 'usual';
    if (checkIn.level >= 4) reasons.unshift('you said you feel stressed');
  }
  return { level, reasons, checkIn, hasSignals };
}

export const STRESS_TIPS: Record<StressRead['level'], string> = {
  calm: 'Your body looks rested today. A good day for a longer walk.',
  usual: 'About your usual. A few slow breaths before meals helps you eat more mindfully.',
  raised: 'Your body may be under some strain. Try 2 minutes of slow breathing (in for 4, out for 6), drink water, and aim for an early night. Stress can push blood sugar and cravings up.',
};

/** Heart numbers for a day, or null when the watch shared none. */
export function heartOf(w: WatchDay | undefined): { resting: number | null; avg: number | null; min: number | null; max: number | null; hrv: number | null } | null {
  if (!w) return null;
  const out = { resting: w.restingHr, avg: w.avgHr, min: w.minHr ?? null, max: w.maxHr ?? null, hrv: w.hrvMs ?? null };
  return Object.values(out).some((v) => v != null) ? out : null;
}
