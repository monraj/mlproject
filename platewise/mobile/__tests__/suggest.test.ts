import { PLATES } from '../src/data/meals';
import { food } from '../src/data/foods';
import { nextSlot, slotTarget, suggestMeals } from '../src/state/suggest';
import type { Day, Meal, Profile } from '../src/state/types';

const profile = { sex: 'female', hideNumbers: false, health: { pregnant: false, diabetes: false, bloodPressure: false } } as unknown as Profile;
const day = (over: Partial<Day> = {}): Day => ({ meals: [], water: 0, greensExtra: 0, steps: 0, skipped: [], ...over });
const meal = (kcal: number, type: Meal['type'], foodId = 'waakye'): Meal =>
  ({ id: `m${kcal}`, type, time: '', minute: 0, title: '', kcal, kcalLow: kcal, kcalHigh: kcal, protein: 10, carbs: 0, fat: 0, greens: 0, oily: false, source: 'text', swatch: '', items: [{ foodId } as Meal['items'][number]] }) as Meal;
const base = { profile, date: '2026-11-01', budget: 1800, proteinGoal: 90 };

describe('meal suggestions', () => {
  it('every plate is built from foods in the table', () => {
    PLATES.forEach((p) => p.parts.forEach(([id]) => expect([p.id, food(id)?.id]).toEqual([p.id, id])));
  });

  it('covers plates from across the country', () => {
    const people = new Set(PLATES.flatMap((p) => p.people));
    ['Akan', 'Ewe', 'Ga-Adangbe', 'Mole-Dagbani', 'Hausa / Zongo'].forEach((g) => expect(people.has(g)).toBe(true));
  });

  it('sizes each meal to what is left of the day', () => {
    expect(slotTarget(1800, 0, 'Breakfast')).toBe(450);
    expect(slotTarget(1800, 500, 'Lunch')).toBe(693);
    expect(slotTarget(1800, 1700, 'Dinner')).toBe(100);
    const s = suggestMeals({ ...base, days: { [base.date]: day() }, slot: 'Lunch' });
    expect(s).toHaveLength(3);
    s.forEach((x) => expect(Math.abs(x.kcal - slotTarget(1800, 0, 'Lunch'))).toBeLessThan(400));
  });

  it('suggests nothing when the day is used up', () => {
    expect(suggestMeals({ ...base, days: { [base.date]: day({ meals: [meal(1750, 'Lunch')] }) }, slot: 'Dinner' })).toEqual([]);
  });

  it('is the same all day but changes on "Show others"', () => {
    const a = suggestMeals({ ...base, days: {}, slot: 'Dinner' }).map((s) => s.plate.id);
    expect(suggestMeals({ ...base, days: {}, slot: 'Dinner' }).map((s) => s.plate.id)).toEqual(a);
    const others = [1, 2, 3].map((n) => suggestMeals({ ...base, days: {}, slot: 'Dinner', shuffle: n }).map((s) => s.plate.id).join());
    expect(others.some((o) => o !== a.join())).toBe(true);
  });

  it('favours lighter starch with diabetes', () => {
    const carbShare = (list: ReturnType<typeof suggestMeals>) => list.reduce((t, s) => t + (s.carbs * 4) / s.kcal, 0) / list.length;
    const plain = suggestMeals({ ...base, days: {}, slot: 'Lunch', limit: 5 });
    const care = suggestMeals({ ...base, profile: { ...profile, health: { pregnant: false, diabetes: true, bloodPressure: false } }, days: {}, slot: 'Lunch', limit: 5 });
    expect(carbShare(care)).toBeLessThanOrEqual(carbShare(plain));
  });

  it('picks the next meal from the clock and the log', () => {
    expect(nextSlot(day(), new Date(2026, 10, 1, 8))).toBe('Breakfast');
    expect(nextSlot(day({ meals: [meal(400, 'Breakfast')] }), new Date(2026, 10, 1, 9))).toBe('Lunch');
    expect(nextSlot(day(), new Date(2026, 10, 1, 19))).toBe('Dinner');
  });
});
