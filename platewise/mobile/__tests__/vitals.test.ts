import { glucoseAdvice, glucoseBand, parseMmol, readingsOf, stressRead } from '../src/state/vitals';
import { shiftKey } from '../src/lib/dates';
import type { Day, WatchDay } from '../src/state/types';

const watch = (over: Partial<WatchDay>): WatchDay => ({
  steps: null, activeKcal: null, totalKcal: null, distanceM: null, exerciseMin: null, sleepMin: null, restingHr: null, avgHr: null, sources: [], syncedAt: '', ...over,
});
const day = (over: Partial<Day>): Day => ({ meals: [], water: 0, greensExtra: 0, steps: 0, skipped: [], ...over });
const TODAY = '2026-11-01';

/** Two weeks of a steady baseline: HRV 50 ms, resting heart 60. */
function baseline(): Record<string, Day> {
  const days: Record<string, Day> = {};
  for (let i = 1; i <= 14; i++) days[shiftKey(TODAY, -i)] = day({ watch: watch({ hrvMs: 50, restingHr: 60, sleepMin: 450 }) });
  return days;
}

describe('blood sugar bands', () => {
  it('reads fasting values against fasting ranges', () => {
    expect(glucoseBand(5.0, 'fasting')).toBe('usual');
    expect(glucoseBand(6.2, 'fasting')).toBe('above');
    expect(glucoseBand(7.0, 'fasting')).toBe('high');
  });

  it('reads after-meal values against after-meal ranges', () => {
    expect(glucoseBand(7.0, 'after')).toBe('usual');
    expect(glucoseBand(9.0, 'after')).toBe('above');
    expect(glucoseBand(11.1, 'random')).toBe('high');
  });

  it('treats low readings as urgent whatever the time', () => {
    expect(glucoseAdvice({ mmol: 3.5, when: 'after' })).toMatchObject({ band: 'low', urgent: true });
    expect(glucoseAdvice({ mmol: 2.8, when: 'fasting' })).toMatchObject({ band: 'very_low', urgent: true });
    expect(glucoseAdvice({ mmol: 12, when: 'after' }).urgent).toBe(false);
  });

  it('accepts mmol/L or mg/dL and refuses nonsense', () => {
    expect(parseMmol('5,4', 'mmol')).toBe(5.4);
    expect(parseMmol('99', 'mgdl')).toBe(5.5);
    expect(parseMmol('0', 'mmol')).toBeNull();
    expect(parseMmol('400', 'mmol')).toBeNull();
    expect(parseMmol('abc', 'mmol')).toBeNull();
  });

  it('merges typed and meter readings in time order without duplicates', () => {
    const d = day({
      glucose: [{ id: 'a', at: '2026-11-01T12:00:00Z', mmol: 6, when: 'after', source: 'manual' }],
      watch: watch({ glucose: [{ id: 'b', at: '2026-11-01T07:00:00Z', mmol: 5, when: 'fasting', source: 'watch' }, { id: 'b', at: '2026-11-01T07:00:00Z', mmol: 5, when: 'fasting', source: 'watch' }] }),
    });
    expect(readingsOf(d).map((g) => g.id)).toEqual(['b', 'a']);
  });
});

describe('stress read', () => {
  it('says nothing without signals or a check-in', () => {
    expect(stressRead({ [TODAY]: day({}) }, TODAY)).toBeNull();
  });

  it('flags strain when HRV drops and resting heart rises against the person’s own usual', () => {
    const days = baseline();
    days[TODAY] = day({ watch: watch({ hrvMs: 35, restingHr: 67, sleepMin: 450 }) });
    const r = stressRead(days, TODAY)!;
    expect(r.level).toBe('raised');
    expect(r.reasons).toHaveLength(2);
  });

  it('reads a rested day as calm', () => {
    const days = baseline();
    days[TODAY] = day({ watch: watch({ hrvMs: 60, restingHr: 57, sleepMin: 480 }) });
    expect(stressRead(days, TODAY)!.level).toBe('calm');
  });

  it('needs a few days of history before comparing', () => {
    const days: Record<string, Day> = { [shiftKey(TODAY, -1)]: day({ watch: watch({ hrvMs: 50, restingHr: 60 }) }) };
    days[TODAY] = day({ watch: watch({ hrvMs: 30, restingHr: 70 }) });
    expect(stressRead(days, TODAY)).toBeNull();
  });

  it('lets the person’s own check-in win', () => {
    const days = baseline();
    days[TODAY] = day({ watch: watch({ hrvMs: 60, restingHr: 57 }), stress: [{ at: '2026-11-01T10:00:00Z', level: 5, from: 'phone' }] });
    const r = stressRead(days, TODAY)!;
    expect(r.level).toBe('raised');
    expect(r.reasons[0]).toBe('you said you feel stressed');
  });
});
