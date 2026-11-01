import { matchFood } from '../src/ai/matcher';
import { buildItem, buildScan } from '../src/ai/pipeline';
import { recommend, type DeviceInfo } from '../src/ai/capability';
import { GB } from '../src/ai/models';

// Expected values come from backend/app/nutrition/matcher.py, so the phone matches like the server.
describe('matcher parity with the server', () => {
  const top = (name: string, aliases: string[] = [], id: string | null = null) => matchFood(name, aliases, id).slice(0, 3).map((m) => [m.food.id, m.score]);

  test('exact names', () => {
    expect(top('waakye')[0]).toEqual(['waakye', 1]);
    expect(top('light soup')[0]).toEqual(['light_soup', 1]);
    expect(top('jollof rice').slice(0, 2)).toEqual([['jollof', 1], ['rice', 0.8]]);
  });

  test('fuzzy scores and aliases', () => {
    expect(top('boiled egg').slice(0, 2)).toEqual([['egg', 1], ['fried_egg', 0.737]]);
    expect(top('kenkey and fish', ['kenkey']).slice(0, 2)).toEqual([['kenkey', 0.95], ['fried_fish', 0.8]]);
    expect(top('plantain', ['kelewele']).slice(0, 2)).toEqual([['fried_plantain', 1], ['kelewele', 0.95]]);
  });

  test('catalogue hint and weak matches', () => {
    expect(top('fufu', [], 'fufu')[0]).toEqual(['fufu', 1]);
    expect(top('xyzzy')[0][1]).toBeLessThan(0.75);
  });
});

describe('pipeline', () => {
  const base = { grams_estimate: 300, grams_low: 250, grams_high: 350, confidence: 0.9 };

  test('a clear match becomes a draft item with per-100 g values and no calories from the model', () => {
    const it = buildItem({ ...base, food_name: 'waakye' }, 0);
    expect(it.foodId).toBe('waakye');
    expect(it.per100?.kcal).not.toBeNull();
    expect(it.grams).toBe(300);
    expect(it.confidence).toBe('ok');
  });

  test('countable foods use whole pieces', () => {
    const it = buildItem({ ...base, food_name: 'egg', count: 2, grams_estimate: 100, grams_low: 90, grams_high: 110 }, 0);
    expect(it.kind).toBe('count');
    expect(it.count).toBe(2);
  });

  test('unknown foods stay unmatched and low confidence', () => {
    const it = buildItem({ ...base, food_name: 'xyzzy' }, 0);
    expect(it.foodId).toBeNull();
    expect(it.confidence).toBe('low');
    expect(it.per100).toBeNull();
  });

  test('not-food photos return no items', () => {
    expect(buildScan({ is_food: false, items: [{ ...base, food_name: 'waakye' }] }, 'gemma-on-device').isFood).toBe(false);
  });
});

describe('device recommendation', () => {
  const phone = (over: Partial<DeviceInfo>): DeviceInfo => ({ name: 'Test', ramBytes: 16 * GB, freeBytes: 80 * GB, is64Bit: true, androidApi: 35, ...over });

  test('a 16 GB phone with space gets the full 4B model', () => {
    const r = recommend(phone({}));
    expect(r.model?.id).toBe('gemma-3-4b');
    expect(r.alternative?.id).toBe('gemma-3-1b');
    expect(r.offline).toContain('Photo scan');
  });

  test('a 6 GB phone gets the 1B text model', () => {
    const r = recommend(phone({ ramBytes: 6 * GB }));
    expect(r.model?.id).toBe('gemma-3-1b');
    expect(r.offline).not.toContain('Photo scan');
  });

  test('plenty of memory but little storage falls back to 1B', () => {
    expect(recommend(phone({ freeBytes: 3 * GB })).model?.id).toBe('gemma-3-1b');
  });

  test('too little memory, storage, or an old or 32-bit phone gets no model', () => {
    expect(recommend(phone({ ramBytes: 2 * GB })).model).toBeNull();
    expect(recommend(phone({ ramBytes: 4 * GB, freeBytes: 1 * GB })).model).toBeNull();
    expect(recommend(phone({ is64Bit: false })).model).toBeNull();
    expect(recommend(phone({ androidApi: 26 })).model).toBeNull();
  });
});

describe('clarifying question', () => {
  const { pickQuestion } = require('../src/lib/clarify');
  const item = (over: object) => ({ ...buildItem({ food_name: 'waakye', grams_estimate: 300, grams_low: 250, grams_high: 350, confidence: 0.9 }, 0), ...over });

  test('asks about the biggest uncertain food first', () => {
    const q = pickQuestion([item({ id: 'a', confidence: 'low' }), item({ id: 'b', grams: 20, gramsLow: 15, gramsHigh: 25 })]);
    expect(q).toMatchObject({ itemId: 'a', kind: 'identity' });
  });

  test('otherwise asks about oil on a big oily dish', () => {
    const stew = buildItem({ food_name: 'palm nut soup', grams_estimate: 300, grams_low: 250, grams_high: 350, confidence: 0.9 }, 1);
    if (stew.kind === 'oil') expect(pickQuestion([stew])).toMatchObject({ kind: 'oil' });
  });

  test('stays quiet when everything is clear', () => {
    expect(pickQuestion([item({ id: 'a' })])).toBeNull();
  });
});

describe('voice dish spellings', () => {
  const { fixDishWords } = require('../src/lib/dishWords');
  test('fixes near-miss dish names and leaves everything else', () => {
    expect(fixDishWords('I had kelewelle with fish')).toBe('I had kelewele with fish');
    expect(fixDishWords('wakye')).toBe('wakye'); // already a known alias
    expect(fixDishWords('two balls of kenkey and pepper')).toBe('two balls of kenkey and pepper');
  });
});

describe('food facts for the on-device coach', () => {
  const { foodFacts } = require('../src/ai/facts');
  test('grounds named dishes in the food table', () => {
    const facts = foodFacts('Is red-red a good lunch?');
    expect(facts[0]).toMatch(/^Red-red \(Beans in palm oil\): a usual portion is .*, about \d+ g, about \d+ kcal/);
  });
  test('adds nothing when no food is named', () => {
    expect(foodFacts('How am I doing this week?')).toEqual([]);
  });
});

describe('made-up numbers', () => {
  const { stripUnverifiedNumbers } = require('../src/ai/facts');
  const given = 'Kelewele (Spiced fried plantain): a usual portion is 1 portion, about 150 g, about 405 kcal and 2 g protein.';
  test('drops the clause with invented figures and keeps the advice', () => {
    expect(stripUnverifiedNumbers('Kelewele is delicious! Try pairing it with black-eyed peas – they’ll add about 180 kcal and 15g of protein to your meal. You could also have spinach stew.', given)).toBe(
      'Kelewele is delicious! Try pairing it with black-eyed peas. You could also have spinach stew.',
    );
  });
  test('drops invented figures in brackets', () => {
    expect(stripUnverifiedNumbers('Pair it with boiled plantain (about 150g, 120 kcal, 2g protein) for balance.', given)).toBe('Pair it with boiled plantain for balance.');
  });
  test('checks both ends of a range, and dates are not evidence', () => {
    expect(stripUnverifiedNumbers('Add grilled fish or boiled eggs for extra protein – about 20-30g more.', `${given} Today is 2026-10-30.`)).toBe('Add grilled fish or boiled eggs for extra protein.');
  });
  test('keeps numbers that came from the food table', () => {
    const s = 'A portion of kelewele is about 405 kcal and 2 g protein.';
    expect(stripUnverifiedNumbers(s, given)).toBe(s);
  });
});

describe('stated portions (same cases as the server)', () => {
  const { statedGrams } = require('../src/ai/portions');
  const { food } = require('../src/data/foods');
  test.each([
    ['two balls of kenkey with fried fish and shito', 'kenkey', 660],
    ['half a plate of jollof and one piece of chicken', 'jollof', 150],
    ['half a plate of jollof and one piece of chicken', 'chicken', 120],
    ['4 slices of bread and a mug of tea', 'bread', 120],
    ['two boiled eggs and half an avocado', 'egg', 100],
    ['two boiled eggs and half an avocado', 'avocado', 100],
    ['three balls of kokonte with palm nut soup', 'kokonte', 900],
    ['a small bowl of red red', 'red_red', 187.5],
    ['I chop two pieces of chicken with fried rice', 'chicken', 240],
  ])('%s → %s', (said, id, grams) => {
    expect(statedGrams(said, food(id))).toBeCloseTo(grams as number);
  });
  test('leaves unstated amounts to the model', () => {
    expect(statedGrams('two balls of kenkey with fried fish', food('fried_fish'))).toBeNull();
    expect(statedGrams('banku and grilled tilapia', food('tilapia'))).toBeNull();
  });
  test('a stated amount overrides the model guess in the pipeline', () => {
    const it = buildItem({ food_name: 'kenkey', grams_estimate: 300, grams_low: 250, grams_high: 350, confidence: 0.9 }, 0, 'two balls of kenkey');
    expect(it.grams).toBe(660);
  });
});

describe('number cleanup keeps paragraphs', () => {
  const { stripUnverifiedNumbers } = require('../src/ai/facts');
  test('line breaks survive and made-up figures go', () => {
    const given = 'Kelewele: about 345 kcal.';
    expect(stripUnverifiedNumbers('First idea.\n\nSecond idea with about 345 kcal.', given)).toBe('First idea.\n\nSecond idea with about 345 kcal.');
    expect(stripUnverifiedNumbers('Tip one.\n\nPeas – they add about 180 kcal.', given)).toBe('Tip one.\n\nPeas.');
  });
});

describe('typed meals with no AI', () => {
  const { parseWithoutAI } = require('../src/ai/quickParse') as typeof import('../src/ai/quickParse');

  it('matches each food and reads stated amounts', () => {
    const r = parseWithoutAI('two balls of kenkey with fried fish and shito');
    const ids = r.items.map((i) => i.foodId);
    expect(r.isFood).toBe(true);
    expect(ids).toContain('kenkey');
    expect(r.items.length).toBeGreaterThanOrEqual(2);
  });

  it('says so when nothing matches', () => {
    const r = parseWithoutAI('qqq zzz');
    expect(r.isFood).toBe(false);
    expect(r.note).toBeTruthy();
  });
});
