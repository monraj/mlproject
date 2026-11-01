import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Day, MealType, Reminders, Weight } from '../state/types';
import { dayKey, shiftKey } from './dates';
import { REPORT_TIMES } from '../state/report';

const MEALS: { key: 'breakfast' | 'lunch' | 'dinner'; type: MealType }[] = [
  { key: 'breakfast', type: 'Breakfast' },
  { key: 'lunch', type: 'Lunch' },
  { key: 'dinner', type: 'Dinner' },
];

// Evidence (two small trials): one prompt a day, timed to when the person usually eats, beats
// fixed-time prompts. Keep quiet at night, and ease off for people who've stopped logging.
const QUIET_START = 21 * 60 + 30;
const QUIET_END = 6 * 60;
const LEARN_DAYS = 14;
const MIN_SAMPLES = 3;
const LEAD_MIN = 10;
const INACTIVE_DAYS = 7;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function askPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

function at(date: Date, minute: number): Date {
  const d = new Date(date);
  d.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
  return d;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** When this person usually logs each meal (a little before), else the time they set. */
export function learnedTimes(r: Reminders, days: Record<string, Day>, today = dayKey()): Record<MealType, number> {
  const out = {} as Record<MealType, number>;
  for (const m of MEALS) {
    const minutes: number[] = [];
    for (let i = 1; i <= LEARN_DAYS; i++) for (const meal of days[shiftKey(today, -i)]?.meals ?? []) if (meal.type === m.type) minutes.push(meal.minute);
    const t = minutes.length >= MIN_SAMPLES ? median(minutes) - LEAD_MIN : toMinutes(r[m.key]);
    out[m.type] = Math.min(QUIET_START, Math.max(QUIET_END, t));
  }
  out.Snack = out.Lunch;
  return out;
}

export type Planned = { date: Date; title: string; body: string; url?: string };

/** At most one meal reminder a day, plus the weigh-in nudge. Pure, so it can be tested. */
export function planReminders(r: Reminders, days: Record<string, Day>, weights: Weight[], now = new Date()): Planned[] {
  if (!r.on) return [];
  const today = dayKey(now);
  const times = learnedTimes(r, days, today);
  const counts = MEALS.map((m) => ({
    m,
    n: Array.from({ length: LEARN_DAYS }, (_, i) => days[shiftKey(today, -i - 1)]?.meals.filter((x) => x.type === m.type).length ?? 0).reduce((a, b) => a + b, 0),
  }));
  // Remind about the meal that is most often missed; that's where a nudge helps most.
  const order = [...counts].sort((a, b) => a.n - b.n || (a.m.type === 'Lunch' ? -1 : 1)).map((x) => x.m);
  const inactive = Array.from({ length: INACTIVE_DAYS }, (_, i) => days[shiftKey(today, -i - 1)]?.meals.length ?? 0).every((n) => n === 0);

  const out: Planned[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);
    const key = dayKey(day);
    if (inactive && i % 3 !== 0) continue;
    const d = days[key];
    const meal = order.find((m) => {
      const when = at(day, times[m.type]);
      return when > now && !d?.meals.some((x) => x.type === m.type) && !d?.skipped.includes(m.type);
    });
    if (meal) out.push({ date: at(day, times[meal.type]), title: `${meal.type} time?`, body: 'Snap it before you eat. It takes 5 seconds.' });
    if (day.getDay() === r.weighDay && !weights.some((w) => w.date === key)) {
      const when = at(day, 7 * 60 + 30);
      if (when > now) out.push({ date: when, title: 'Weigh-in day', body: 'Step on the scale before breakfast. Your trend keeps your target honest.' });
    }
  }
  return out;
}

/** The afternoon (2 pm) and evening (8 pm) summaries for the next 3 days. They open the report. */
export function planReports(on: boolean, now = new Date()): Planned[] {
  if (!on) return [];
  const out: Planned[] = [];
  for (let i = 0; i < 3; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);
    for (const [part, minute] of Object.entries(REPORT_TIMES) as ['afternoon' | 'evening', number][]) {
      const when = at(day, minute);
      if (when <= now) continue;
      out.push(
        part === 'afternoon'
          ? { date: when, title: 'Your afternoon check-in', body: 'See how your day is going and what to eat next.', url: '/report?part=afternoon' }
          : { date: when, title: 'Your day in review', body: 'Food, water, stress and blood sugar in one place.', url: '/report?part=evening' },
      );
    }
  }
  return out;
}

/** Reschedules everything whenever the log changes. `extra` carries other plans, like the fasting window. */
export async function syncReminders(r: Reminders, days: Record<string, Day>, weights: Weight[], reports = true, extra: Planned[] = []): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!r.on && !reports && !extra.length) return;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    for (const p of [...planReminders(r, days, weights), ...planReports(reports), ...extra]) {
      await Notifications.scheduleNotificationAsync({
        content: { title: p.title, body: p.body, data: p.url ? { url: p.url } : {} },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.date },
      });
    }
  } catch {
    // Notifications are a nice-to-have; never break the app over them.
  }
}
