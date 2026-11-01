import { compose, guessDishes, seenIngredients } from '../src/ai/guess';
import { buildItem } from '../src/ai/pipeline';
import { FOODS, food } from '../src/data/foods';

const item = (name: string, ingredients: [string, number][], confidence = 0.4) => ({
  food_name: name, grams_estimate: 200, grams_low: 150, grams_high: 250, confidence, ingredients: ingredients.map(([n, share]) => ({ name: n, share })),
});
const top = (ing: [string, number][]) => guessDishes(seenIngredients(ing.map(([name, share]) => ({ name, share }))))[0];

describe('guessing a dish from its ingredients (same as the server)', () => {
  it('every dish ingredient is in the table', () => {
    FOODS.forEach((f) => (f.ingredients ?? []).forEach((i) => expect([f.id, food(i)?.id]).toEqual([f.id, i])));
  });

  it('reads local names as ingredients, not dishes', () => {
    expect(seenIngredients([{ name: 'zomi', share: 0.2 }, { name: 'kontomire', share: 0.5 }, { name: 'egusi seeds', share: 0.2 }]).map((s) => s.food.id).sort()).toEqual(['agushie_seeds', 'kontomire_leaves', 'palm_oil']);
  });

  it('finds dishes from across the country', () => {
    expect(top([['cocoyam leaves', 0.5], ['agushie', 0.2], ['palm oil', 0.15], ['smoked herring', 0.15]]).food.id).toBe('palava_sauce');
    expect(top([['baobab leaves', 0.5], ['dawadawa', 0.1], ['dried fish', 0.2], ['tomato', 0.2]]).food.id).toBe('kuka_soup');
    expect(top([['gari', 0.4], ['egg', 0.2], ['tomato', 0.3], ['oil', 0.1]]).food.id).toBe('gari_foto');
    expect(top([['yam', 0.7], ['palm oil', 0.2], ['egg', 0.1]]).food.id).toBe('oto');
  });

  it('is not sure from common ingredients alone', () => {
    expect(top([['rice', 0.6], ['palm oil', 0.1], ['tomatoes', 0.3]]).score).toBeLessThan(0.7);
  });

  it('works out an unknown dish from its ingredients', () => {
    const mix = compose(seenIngredients([{ name: 'rice', share: 0.6 }, { name: 'palm oil', share: 0.1 }, { name: 'tomatoes', share: 0.3 }]), 'Red rice')!;
    const want = food('rice')!.per100.kcal! * 0.6 + food('palm_oil')!.per100.kcal! * 0.1 + food('tomato')!.per100.kcal! * 0.3;
    expect(Math.abs(mix.per100.kcal! - want)).toBeLessThan(0.2);
  });

  it('fills in a strong guess on a scan but asks to check', () => {
    const d = buildItem(item('unknown dish', [['kontomire', 0.5], ['agushie', 0.2], ['palm oil', 0.15], ['smoked herring', 0.15]]), 0);
    expect(d.foodId).toBe('palava_sauce');
    expect(d.confidence).toBe('low');
    expect(d.hint).toMatch(/^Looks like/);
  });

  it('keeps a worked-out dish off the table but still counts it', () => {
    const d = buildItem(item('zzq special', [['rice', 0.6], ['palm oil', 0.1], ['tomatoes', 0.3]]), 0);
    expect(d.foodId).toBeNull();
    expect(d.per100?.kcal).toBeGreaterThan(0);
    expect(d.hint).toMatch(/ingredients/);
  });
});
