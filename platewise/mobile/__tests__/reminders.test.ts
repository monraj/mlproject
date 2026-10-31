jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn(), SchedulableTriggerInputTypes: { DATE: 'date' } }));

import { learnedTimes, planReminders } from '../src/lib/reminders';
import { dayKey, shiftKey } from '../src/lib/dates';
import type { Day, Meal, Reminders } from '../src/state/types';

const r: Reminders = { on: true, breakfast: '07:30', lunch: '12:45', dinner: '19:00', weighDay: 1 };
const meal = (type: Meal['type'], minute: number) => ({ type, minute }) as Meal;
const day = (meals: Meal[]): Day => ({ meals, water: 0, greensExtra: 0, steps: 0, skipped: [] });

describe('reminders', () => {
  const now = new Date(2026, 9, 28, 6, 0); // Wednesday 06:00
  const today = dayKey(now);

  it('learns the usual time for a meal and stays out of quiet hours', () => {
    const days: Record<string, Day> = {};
    for (let i = 1; i <= 4; i++) days[shiftKey(today, -i)] = day([meal('Lunch', 13 * 60 + 30), meal('Dinner', 23 * 60)]);
    const t = learnedTimes(r, days, today);
    expect(t.Lunch).toBe(13 * 60 + 20);
    expect(t.Dinner).toBe(21 * 60 + 30);
    expect(t.Breakfast).toBe(7 * 60 + 30);
  });

  it('sends at most one meal reminder a day, for the meal most often missed', () => {
    const days: Record<string, Day> = {};
    for (let i = 1; i <= 7; i++) days[shiftKey(today, -i)] = day([meal('Breakfast', 450), meal('Lunch', 780)]);
    const plan = planReminders({ ...r, weighDay: 9 }, days, [], now);
    expect(plan).toHaveLength(7);
    expect(plan.every((p) => p.title === 'Dinner time?')).toBe(true);
  });

  it('eases off when someone has stopped logging', () => {
    const plan = planReminders({ ...r, weighDay: 9 }, {}, [], now);
    expect(plan.length).toBe(3);
  });

  it('is silent when reminders are off', () => {
    expect(planReminders({ ...r, on: false }, {}, [], now)).toEqual([]);
  });
});
