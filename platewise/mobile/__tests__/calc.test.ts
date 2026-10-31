import { clampBudget, dailyBudget, formulaTdee, healthNotes, itemKcal, learnBurn, mealKcal, profileProblem, safePace, share, toMealItem, trendLine, underweightNow, weeklyRate } from '../src/state/calc';
import { food } from '../src/data/foods';
import type { Day, DraftItem } from '../src/state/types';
import { dayKey, shiftKey } from '../src/lib/dates';

function item(id: string, patch: Partial<DraftItem> = {}): DraftItem {
  const f = food(id)!;
  return {
    id, name: f.name, foodId: f.id, aiFoodId: f.id, aiGrams: f.portionG, grams: f.portionG, gramsLow: f.portionG * 0.8, gramsHigh: f.portionG * 1.2,
    per100: f.per100, uncertainty: 0.2, confidence: 'ok', kind: 'grams', oil: 'normal', oily: f.oily, greens: f.greens, candidates: [], countG: f.countG, ...patch,
  };
}

describe('calorie maths', () => {
  it('computes kcal from the food table and grams, with a range', () => {
    const k = itemKcal(item('egg', { grams: 100 }));
    expect(k.mid).toBeCloseTo(155);
    expect(k.low).toBeLessThan(k.mid);
    expect(k.high).toBeGreaterThan(k.mid);
  });

  it('uses count × grams per piece for countable foods', () => {
    expect(itemKcal(item('egg', { kind: 'count', count: 2 })).mid).toBeCloseTo(155);
  });

  it('scales only oily dishes by the oil level', () => {
    const stew = item('pepper_stew', { kind: 'oil' });
    expect(itemKcal({ ...stew, oil: 'very' }).mid).toBeGreaterThan(itemKcal({ ...stew, oil: 'light' }).mid);
    const egg = item('egg');
    expect(itemKcal({ ...egg, oil: 'very' }).mid).toBe(itemKcal({ ...egg, oil: 'light' }).mid);
  });

  it('counts an unmatched item as zero until the person picks a food', () => {
    expect(itemKcal(item('egg', { per100: null })).mid).toBe(0);
  });

  it('sums a meal', () => {
    const items = [item('waakye'), item('egg')];
    expect(mealKcal(items).mid).toBeCloseTo(itemKcal(items[0]).mid + itemKcal(items[1]).mid);
  });

  it('keeps the AI guess next to the final value', () => {
    const m = toMealItem(item('waakye', { grams: 250, aiGrams: 320 }));
    expect(m.aiGrams).toBe(320);
    expect(m.grams).toBe(250);
    expect(m.wasCorrected).toBe(true);
    expect(toMealItem(item('waakye')).wasCorrected).toBe(false);
  });

  it('clamps shares to 0..1', () => {
    expect(share(500, 1000)).toBe(0.5);
    expect(share(2000, 1000)).toBe(1);
    expect(share(10, 0)).toBe(0);
  });
});

describe('safety rules (mirror backend/app/safety/rules.py)', () => {
  const base = { sex: 'female' as const, age: 29, heightCm: 165, weightKg: 84, goalKg: 76, activity: 1.375, paceKgWeek: 0.5 };

  it('never sets a budget under the floor', () => {
    expect(clampBudget(900, 'female')).toBe(1200);
    expect(clampBudget(1300, 'male')).toBe(1500);
    expect(clampBudget(1794, 'female')).toBe(1790);
    expect(dailyBudget({ ...base, weightKg: 50, goalKg: 48, heightCm: 150, age: 60, activity: 1.2, paceKgWeek: 0.75 }, 1300)).toBe(1200);
  });

  it('matches the backend budget maths', () => {
    expect(dailyBudget(base, 2400)).toBe(1850);
    expect(formulaTdee(base)).toBeCloseTo((10 * 84 + 6.25 * 165 - 5 * 29 - 161) * 1.375);
  });

  it('blocks under-18s and underweight goals', () => {
    expect(profileProblem({ ...base, age: 17 })).toMatch(/18/);
    expect(profileProblem({ ...base, goalKg: 48 })).toMatch(/underweight/);
    expect(profileProblem(base)).toBeNull();
  });

  it('never sets a deficit in pregnancy and flags health conditions', () => {
    const none = { pregnant: false, diabetes: false, bloodPressure: false };
    expect(safePace(0.5, { ...none, pregnant: true })).toBe(0);
    expect(safePace(0.5, none)).toBe(0.5);
    expect(safePace(0.5)).toBe(0.5);
    expect(healthNotes(none)).toEqual([]);
    expect(healthNotes({ ...none, diabetes: true, bloodPressure: true })).toHaveLength(2);
  });

  it('spots people who are already underweight', () => {
    expect(underweightNow({ heightCm: 165, weightKg: 48 })).toBe(true);
    expect(underweightNow({ heightCm: 165, weightKg: 84 })).toBe(false);
  });
});

describe('weight trend and learned burn', () => {
  it('smooths weigh-ins and reports a weekly rate', () => {
    const today = dayKey();
    const w = Array.from({ length: 15 }, (_, i) => ({ date: shiftKey(today, i - 14), kg: 84 - i * 0.07 }));
    const t = trendLine(w);
    expect(t[t.length - 1].trend).toBeGreaterThan(w[w.length - 1].kg); // lags behind
    expect(weeklyRate(w)!).toBeLessThan(0);
  });

  it('back-solves daily burn from intake and trend', () => {
    const today = dayKey();
    const weights = Array.from({ length: 22 }, (_, i) => ({ date: shiftKey(today, i - 21), kg: 84 - (i * 0.5) / 7 }));
    const days: Record<string, Day> = {};
    for (let i = 0; i < 22; i++) days[shiftKey(today, i - 21)] = { meals: [{ kcal: 1800 } as never], water: 0, greensExtra: 0, steps: 0, skipped: [] };
    const r = learnBurn(days, weights);
    expect(r && 'tdee' in r).toBe(true);
    if (r && 'tdee' in r) expect(r.tdee).toBeGreaterThan(1800);
    expect(learnBurn({}, weights.slice(-3))).toEqual({ need: expect.stringMatching(/weigh-ins/) });
  });
});

describe('portions', () => {
  it('builds quick portion chips from the food table', () => {
    const { portionPresets } = require('../src/lib/portions');
    expect(portionPresets({ portionG: 330, portionLabel: '1 ball' }).map((p: { label: string }) => p.label)).toEqual(['½ ball', '1 ball', '1½ balls', '2 balls']);
    expect(portionPresets({ portionG: 120, portionLabel: '3 pieces' }).map((p: { label: string; grams: number }) => [p.label, p.grams])).toEqual([
      ['1 piece', 40],
      ['3 pieces', 120],
      ['6 pieces', 240],
    ]);
  });

  it('counts only your share of a shared bowl, without calling it a correction', () => {
    const { itemGrams, toMealItem } = require('../src/state/calc');
    const it = { id: 'x', name: 'Waakye', foodId: 'waakye', aiFoodId: 'waakye', aiGrams: 600, grams: 600, gramsLow: 500, gramsHigh: 700, per100: { kcal: 150, protein: 5, carbs: 25, fat: 3 }, uncertainty: 0.2, confidence: 'ok', kind: 'grams', oil: 'normal', oily: false, greens: false, candidates: [], portionShare: 0.5 };
    expect(itemGrams(it)).toBe(300);
    const m = toMealItem(it);
    expect(m.grams).toBe(300);
    expect(m.wasCorrected).toBe(false);
  });
});

describe('weekly consistency', () => {
  it('counts logged days in the last 7 without resetting on a miss', () => {
    const { weekLogged } = require('../src/state/calc');
    const today = '2026-10-28';
    const d = { meals: [{}], water: 0, greensExtra: 0, steps: 0, skipped: [] };
    const empty = { ...d, meals: [] };
    expect(weekLogged({ [today]: d, [shiftKey(today, -1)]: empty, [shiftKey(today, -2)]: d, [shiftKey(today, -8)]: d }, today)).toBe(2);
  });
});

describe('wellbeing check', () => {
  const { wellbeingCheck } = require('../src/state/insights');
  const today = '2026-10-28';
  const profile = { sex: 'female', heightCm: 165, weightKg: 70, goalKg: 64 };
  const day = (kcal: number) => ({ meals: [{ kcal }], water: 0, greensExtra: 0, steps: 0, skipped: [] });

  it('stays quiet for normal logging', () => {
    const days = Object.fromEntries([1, 2, 3, 4].map((i) => [shiftKey(today, -i), day(1500)]));
    expect(wellbeingCheck(profile, days, [], today)).toBeNull();
  });

  it('gently flags several very low days', () => {
    const days = Object.fromEntries([1, 2, 3].map((i) => [shiftKey(today, -i), day(600)]));
    expect(wellbeingCheck(profile, days, [], today)).toMatch(/talk to a doctor/);
  });

  it('flags loss that is much faster than safe', () => {
    const weights = Array.from({ length: 15 }, (_, i) => ({ date: shiftKey(today, i - 14), kg: 70 - i * 0.3 }));
    expect(wellbeingCheck(profile, {}, weights, today)).toMatch(/faster than is usually safe|below the healthy range/);
  });
});
