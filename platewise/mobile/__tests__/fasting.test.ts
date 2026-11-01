import { fastingBlock, fastingPlanAllowed, mustBreakFast } from '../src/state/calc';
import { DEFAULT_FASTING, TRADITIONAL, eatUntil, fastWindow, planFasting } from '../src/state/fasting';
import { food } from '../src/data/foods';
import type { Profile } from '../src/state/types';

const p = { age: 35, weightKg: 70, heightCm: 165, health: { pregnant: false, diabetes: false, bloodPressure: false } } as Profile;
const f = DEFAULT_FASTING;

describe('fasting safety (mirrors backend rules)', () => {
  it('is open to healthy adults', () => expect(fastingBlock(p, f)).toBeNull());
  it('is never offered in pregnancy, with an eating disorder, or when underweight', () => {
    expect(fastingBlock({ ...p, health: { ...p.health!, pregnant: true } }, f)).toBe('pregnant');
    expect(fastingBlock(p, { ...f, eatingDisorder: true, doctorOk: true })).toBe('eating_disorder');
    expect(fastingBlock({ ...p, weightKg: 48 }, f)).toBe('underweight');
  });
  it('needs a doctor with insulin or sulfonylurea tablets', () => {
    expect(fastingBlock(p, { ...f, meds: 'other' })).toBe('glucose_meds');
    expect(fastingBlock(p, { ...f, meds: 'other', doctorOk: true })).toBeNull();
    expect(fastingBlock(p, { ...f, meds: 'metformin' })).toBeNull();
  });
  it('keeps diabetes to 12 hours without a doctor', () => {
    expect(fastingPlanAllowed('12:12', true, false)).toBe(true);
    expect(fastingPlanAllowed('16:8', true, false)).toBe(false);
    expect(fastingPlanAllowed('16:8', true, true)).toBe(true);
  });
  it('ends the fast below 3.9 mmol/L', () => {
    expect(mustBreakFast(3.8)).toBe(true);
    expect(mustBreakFast(3.9)).toBe(false);
  });
});

describe('fasting clock', () => {
  const plan = { plan: '16:8' as const, eatFrom: '10:00' };
  it('knows the eating window', () => {
    const w = fastWindow(plan, new Date(2026, 10, 1, 14));
    expect(w.eating).toBe(true);
    expect(w.end.getHours()).toBe(18);
    expect(w.progress).toBeCloseTo(0.5);
    expect(eatUntil(plan)).toBe('18:00');
  });
  it('counts the fast across midnight', () => {
    const w = fastWindow(plan, new Date(2026, 10, 2, 2));
    expect(w.eating).toBe(false);
    expect(w.start.getDate()).toBe(1);
    expect(w.end.getHours()).toBe(10);
    expect(w.minutesLeft).toBe(480);
  });
  it('plans reminders only when on, with a sugar check for diabetes', () => {
    expect(planFasting({ ...f, on: false }, false)).toEqual([]);
    const now = new Date(2026, 10, 1, 5);
    expect(planFasting({ ...f, on: true }, false, now)).toHaveLength(6);
    expect(planFasting({ ...f, on: true }, true, now).some((r) => r.url === '/vitals')).toBe(true);
  });
  it('lists traditional foods that are in the table', () => {
    TRADITIONAL.forEach((t) => expect(food(t.foodId)?.id).toBe(t.foodId));
  });
});
