import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Day, Reminders, Weight } from '../state/types';
import { dayKey } from './dates';

const MEALS: { key: 'breakfast' | 'lunch' | 'dinner'; type: string }[] = [
  { key: 'breakfast', type: 'Breakfast' },
  { key: 'lunch', type: 'Lunch' },
  { key: 'dinner', type: 'Dinner' },
];

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

function at(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

/**
 * Smart reminders: one notification per meal for the next 7 days, skipped for meals already logged
 * today, and a weigh-in nudge on the chosen day. Rescheduled whenever the log changes.
 */
export async function syncReminders(r: Reminders, days: Record<string, Day>, weights: Weight[]): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!r.on) return;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const day = new Date(now);
      day.setDate(now.getDate() + i);
      const key = dayKey(day);
      const logged = days[key]?.meals ?? [];
      for (const m of MEALS) {
        const when = at(day, r[m.key]);
        if (when <= now || logged.some((x) => x.type === m.type) || days[key]?.skipped.includes(m.type)) continue;
        await Notifications.scheduleNotificationAsync({
          content: { title: `${m.type} time?`, body: 'Snap it before you eat. It takes 5 seconds.' },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
        });
      }
      if (day.getDay() === r.weighDay && !weights.some((w) => w.date === key)) {
        const when = at(day, '07:30');
        if (when > now) {
          await Notifications.scheduleNotificationAsync({
            content: { title: 'Weigh-in day', body: 'Step on the scale before breakfast. Your trend keeps your budget honest.' },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
          });
        }
      }
    }
  } catch {
    // Notifications are a nice-to-have; never break the app over them.
  }
}
