import { ACTIVITY_CAP, activityBonus } from '../src/state/calc';
import { watchSummary } from '../src/state/insights';
import type { WatchDay } from '../src/state/types';

const day = (over: Partial<WatchDay>): WatchDay => ({
  steps: null, activeKcal: null, totalKcal: null, distanceM: null, exerciseMin: null, sleepMin: null, restingHr: null, avgHr: null, sources: [], syncedAt: '', ...over,
});

describe('smartwatch exercise in the budget', () => {
  it('adds half of active calories, rounded, only when switched on', () => {
    expect(activityBonus(420, true)).toBe(210);
    expect(activityBonus(425, true)).toBe(210);
    expect(activityBonus(420, false)).toBe(0);
    expect(activityBonus(null, true)).toBe(0);
  });

  it('never adds more than the daily cap', () => {
    expect(activityBonus(2500, true)).toBe(ACTIVITY_CAP);
  });
});

describe('watch data for the coach', () => {
  it('summarises the day', () => {
    expect(watchSummary(day({ steps: 8200, activeKcal: 310, exerciseMin: 35, sleepMin: 400, restingHr: 62 }))).toBe(
      '; watch: 8,200 steps, 310 kcal active, 35 min exercise, slept 6 h 40 min, resting heart 62',
    );
  });

  it('says nothing without watch data', () => {
    expect(watchSummary(undefined)).toBe('');
    expect(watchSummary(day({}))).toBe('');
  });
});

describe('Pixel Watch payload', () => {
  const { quickMeals, resolveRef, streak } = require('../src/wear/payload') as typeof import('../src/wear/payload');
  const meal = (id: string, title: string, kcal: number) => ({ id, title, kcal, items: [] }) as unknown as import('../src/state/types').Meal;
  const dayOf = (meals: import('../src/state/types').Meal[]) => ({ meals, water: 0, greensExtra: 0, steps: 0, skipped: [] });

  it('offers saved meals first, then recent ones without repeats', () => {
    const days = { '2026-11-01': dayOf([meal('a', 'Waakye', 600), meal('b', 'Kenkey', 500)]), '2026-10-31': dayOf([meal('c', 'Waakye', 610)]) };
    const q = quickMeals([{ id: 's1', name: 'My oats', kcal: 300, items: [] }], days, '2026-11-01');
    expect(q.map((x) => x.title)).toEqual(['My oats', 'Kenkey', 'Waakye']);
    expect(resolveRef(q[1].ref, [], days)?.source).toBe('copy');
    expect(resolveRef('meal:2026-11-01:gone', [], days)).toBeNull();
  });

  it('counts days logged in a row', () => {
    const days = { '2026-11-01': dayOf([meal('a', 'x', 1)]), '2026-10-31': dayOf([meal('b', 'x', 1)]), '2026-10-29': dayOf([meal('c', 'x', 1)]) };
    expect(streak(days, '2026-11-01')).toBe(2);
    expect(streak({ '2026-10-31': dayOf([meal('b', 'x', 1)]) }, '2026-11-01')).toBe(1);
  });
});
