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
