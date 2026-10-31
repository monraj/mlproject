import { familiarFood, relate, shareOfDay, walkingTime } from '../src/lib/relate';
import { food } from '../src/data/foods';

describe('calories in everyday terms', () => {
  it('describes a meal as a share of the day', () => {
    expect(shareOfDay(590, 1770)).toBe('about a third of your day');
    expect(shareOfDay(885, 1770)).toBe('about half of your day');
    expect(shareOfDay(60, 1770)).toBe('a small part of your day');
    expect(shareOfDay(2300, 1770)).toBe('more than your whole day');
  });

  it('compares with balls of kenkey, from the food table', () => {
    const ball = (food('kenkey')!.per100.kcal! * food('kenkey')!.countG!) / 100;
    expect(familiarFood(ball)).toBe('about as much energy as 1 ball of kenkey');
    expect(familiarFood(ball * 1.5)).toBe('about as much energy as 1½ balls of kenkey');
    expect(familiarFood(ball / 2)).toBe('about as much energy as ½ ball of kenkey');
  });

  it('uses slices of bread for small amounts', () => {
    expect(familiarFood(150)).toMatch(/slices? of bread/);
  });

  it('gives walking time from body weight, framed as energy', () => {
    // 380 kcal at 70 kg: 380 / (3.8 × 70) h = 86 min; 600 kcal = 135 min → about 2½ hours
    expect(walkingTime(380, 70)).toBe('energy for about 85 minutes of brisk walking');
    expect(walkingTime(600, 70)).toBe('energy for about 2½ hours of brisk walking');
    expect(walkingTime(130, 70)).toBe('energy for about 30 minutes of brisk walking');
  });

  it('only adds walking time when switched on, and hides food comparisons in hide-numbers mode', () => {
    expect(relate(590, 1770, { weightKg: 70 })).toHaveLength(2);
    expect(relate(590, 1770, { weightKg: 70, showWalking: true })).toHaveLength(3);
    expect(relate(590, 1770, { hideNumbers: true })).toEqual(['about a third of your day']);
  });
});
