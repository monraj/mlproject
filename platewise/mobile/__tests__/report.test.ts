import { buildReport, reportFacts } from '../src/state/report';
import { planReports } from '../src/lib/reminders';
import type { Day, Meal, Profile } from '../src/state/types';

const profile = { name: 'Ama', sex: 'female', hideNumbers: false, health: { pregnant: false, diabetes: false, bloodPressure: false } } as unknown as Profile;
const meal = (kcal: number, protein: number, greens = 0): Meal =>
  ({ id: `m${kcal}`, type: 'Lunch', time: '', minute: 0, title: '', kcal, kcalLow: kcal, kcalHigh: kcal, protein, carbs: 0, fat: 0, greens, oily: false, source: 'text', swatch: '', items: [] }) as Meal;
const day = (over: Partial<Day> = {}): Day => ({ meals: [], water: 0, greensExtra: 0, steps: 0, skipped: [], ...over });
const D = '2026-11-01';
const AFTERNOON = new Date(2026, 10, 1, 14);

describe('summary report', () => {
  it('says what is left in the afternoon', () => {
    const r = buildReport(profile, { [D]: day({ meals: [meal(600, 30)], water: 3 }) }, [], D, 1800, 'afternoon', AFTERNOON);
    expect(r.title).toBe('Afternoon check-in');
    expect(r.lines.find((l) => l.key === 'food')?.text).toContain('1,200 kcal left');
    expect(r.next.length).toBeGreaterThan(0);
  });

  it('reviews the day in the evening', () => {
    const r = buildReport(profile, { [D]: day({ meals: [meal(900, 50, 2), meal(850, 40, 1)], water: 8 }) }, [], D, 1800, 'evening');
    expect(r.title).toBe('Your day in review');
    expect(r.wins).toContain('You stayed close to your budget today.');
    expect(r.wins).toContain('You hit your water goal.');
  });

  it('puts a low blood sugar first', () => {
    const r = buildReport(profile, { [D]: day({ glucose: [{ id: 'g', at: '2026-11-01T10:00:00Z', mmol: 3.4, when: 'random', source: 'manual' }] }) }, [], D, 1800, 'now', AFTERNOON);
    expect(r.urgent).toMatch(/^Low/);
    expect(reportFacts(r)).toContain('Urgent:');
  });

  it('hides numbers when the person asked', () => {
    const r = buildReport({ ...profile, hideNumbers: true }, { [D]: day({ meals: [meal(600, 30)] }) }, [], D, 1800, 'afternoon', AFTERNOON);
    expect(r.lines.find((l) => l.key === 'food')?.text).not.toMatch(/kcal/);
  });

  it('shares no name with the AI', () => {
    const r = buildReport(profile, { [D]: day({ meals: [meal(600, 30)] }) }, [], D, 1800, 'evening');
    expect(reportFacts(r)).not.toContain('Ama');
  });
});

describe('report notifications', () => {
  it('schedules 2 pm and 8 pm for three days, skipping times already past', () => {
    const plan = planReports(true, new Date(2026, 10, 1, 15));
    expect(plan.map((p) => `${p.date.getDate()} ${p.date.getHours()}`)).toEqual(['1 20', '2 14', '2 20', '3 14', '3 20']);
    expect(plan[0].url).toBe('/report?part=evening');
  });

  it('schedules nothing when switched off', () => {
    expect(planReports(false)).toEqual([]);
  });
});
