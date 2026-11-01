import { needsFor } from '../src/state/needs';
import { suggestMeals } from '../src/state/suggest';
import { personalTarget, profileBudget } from '../src/state/calc';
import type { Day, Profile, WatchDay } from '../src/state/types';

const base = { name: 'Ama', sex: 'female', age: 30, heightCm: 165, weightKg: 62, hideNumbers: false, health: { pregnant: false, diabetes: false, bloodPressure: false } } as unknown as Profile;
const day = (watch: Partial<WatchDay>): Day => ({ meals: [], water: 0, greensExtra: 0, steps: 0, skipped: [], watch: { steps: null, activeKcal: null, totalKcal: null, distanceM: null, exerciseMin: null, sleepMin: null, restingHr: null, avgHr: null, sources: [], syncedAt: '', ...watch } });

test('protein needs rise with age and in pregnancy', () => {
  expect(needsFor(base, undefined).proteinG).toBe(50); // 62 kg × 0.8
  expect(needsFor({ ...base, age: 70 }, undefined)).toMatchObject({ proteinG: 68, proteinWeight: 1.5, reason: 'Protein to keep your muscles strong' });
  expect(needsFor({ ...base, health: { ...base.health!, pregnant: true } }, undefined).reason).toBe('Extra protein for you and baby');
});

test('the latest weigh-in is used, and height gives the BMI', () => {
  expect(needsFor(base, undefined, [{ date: '2026-10-01', kg: 80 }]).greensWeight).toBe(1.6); // BMI 29.4
  expect(needsFor({ ...base, weightKg: 48 }, undefined)).toMatchObject({ fuller: true, starch: 'more' }); // BMI 17.6
});

test('Health Connect activity and sleep steer the plate', () => {
  expect(needsFor(base, day({ steps: 12500 })).starch).toBe('more');
  expect(needsFor(base, day({ exerciseMin: 45 })).reason).toBe('Fuel and protein after an active day');
  expect(needsFor(base, day({ steps: 1800 }), [], true).starch).toBe('lighter');
  expect(needsFor(base, day({ steps: 1800 }), [], false).starch).toBe('usual'); // not judged before evening
  expect(needsFor(base, day({ sleepMin: 300 })).reason).toBe('A steady plate after a short night');
});

test('an older person is offered more protein-rich plates', () => {
  const avg = (p: Profile) => {
    const list = suggestMeals({ profile: p, days: {}, date: '2026-11-01', budget: 1800, proteinGoal: 60, slot: 'Lunch', limit: 3 });
    return list.reduce((t, x) => t + x.protein / x.kcal, 0) / list.length;
  };
  expect(avg({ ...base, age: 72 })).toBeGreaterThanOrEqual(avg(base));
});

test('sex counts: women 19-50 lean towards greens and beans for iron', () => {
  expect(needsFor(base, undefined)).toMatchObject({ iron: true, reason: 'Greens and beans for iron' });
  expect(needsFor({ ...base, sex: 'male' } as Profile, undefined)).toMatchObject({ iron: false, reason: null });
  expect(needsFor({ ...base, age: 55 }, undefined).iron).toBe(false);
});

test('the daily target uses the latest weigh-in and Health Connect steps', () => {
  const p = { ...base, goalKg: 58, paceKgWeek: 0.25, activity: 1.2, learnedTdee: null } as unknown as Profile;
  const today = '2026-11-01';
  // No data yet: the setup answers.
  expect(personalTarget(p, [], {}, today)).toMatchObject({ kcal: profileBudget(p), basis: { steps: null, weighedIn: false } });
  // Two weeks averaging 9,000 steps: 'Active', not the 'Mostly sitting' picked at setup.
  const days: Record<string, Day> = {};
  for (let i = 1; i <= 10; i++) days[`2026-10-${String(32 - i).padStart(2, '0')}`] = day({ steps: 9000 });
  const t = personalTarget(p, [{ date: '2026-10-30', kg: 66 }], days, today);
  expect(t.basis).toMatchObject({ steps: 9000, activity: 1.55, weightKg: 66, weighedIn: true });
  expect(t.kcal).toBe(profileBudget({ ...p, weightKg: 66, activity: 1.55 }));
  expect(t.kcal).toBeGreaterThan(profileBudget(p));
  // Fewer than 7 days of steps: not enough to go on.
  expect(personalTarget(p, [], { '2026-10-31': day({ steps: 15000 }) }, today).basis.steps).toBeNull();
});
