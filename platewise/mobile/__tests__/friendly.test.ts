import { friendlyAmount, friendlySummary, parsePortion } from '../src/lib/friendly';
import { namesSoFar } from '../src/api/client';
import type { DraftItem } from '../src/state/types';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const item = (p: Partial<DraftItem>): DraftItem =>
  ({ id: 'x', name: 'Waakye', foodId: 'waakye', aiFoodId: 'waakye', aiGrams: 300, grams: 300, gramsLow: 250, gramsHigh: 350, per100: null, uncertainty: 0.2, confidence: 'ok', kind: 'grams', oil: 'normal', oily: false, greens: false, candidates: [], ...p }) as DraftItem;

test('portion labels are read as a number and a unit', () => {
  expect(parsePortion('2 balls')).toEqual({ n: 2, unit: 'ball' });
  expect(parsePortion('1/2 cup')).toEqual({ n: 0.5, unit: 'cup' });
  expect(parsePortion('2 potatoes')).toEqual({ n: 2, unit: 'potato' });
  expect(parsePortion('plenty')).toBeNull();
});

test('amounts are said in everyday portions', () => {
  expect(friendlyAmount(item({ grams: 300 }))).toBe('about 1 plate');
  expect(friendlyAmount(item({ grams: 450 }))).toBe('about 1½ plates');
  expect(friendlyAmount(item({ grams: 120 }))).toBe('about ½ plate');
  expect(friendlyAmount(item({ name: 'Kenkey', foodId: 'kenkey', kind: 'count', count: 2, grams: 660 }))).toBe('2 balls');
  expect(friendlyAmount(item({ foodId: null, grams: 183 }))).toBe('about 180 g');
});

test('the summary names each food and asks to check unsure ones', () => {
  const s = friendlySummary([item({}), item({ name: 'Shito', foodId: 'shito', grams: 30, confidence: 'low' })]);
  expect(s).toBe('I can see waakye (about 1 plate) and shito (about 2 tbsp). I’m not fully sure about shito, so take a quick look on the next page.');
});

test('food names are read from a scan answer still being written', () => {
  expect(namesSoFar('{"is_food": true, "items": [{"food_name": "Waakye", "grams_estimate": 3')).toEqual(['Waakye']);
  expect(namesSoFar('[{"food_name":"Red red"},{"food_name": "Fried \\"ripe\\" plantain"')).toEqual(['Red red', 'Fried "ripe" plantain']);
});
