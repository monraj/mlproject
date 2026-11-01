import { suggestMeals } from '../src/state/suggest';
import { PLATES } from '../src/data/meals';
import { food } from '../src/data/foods';
import type { Profile } from '../src/state/types';

const p = { name: 'Kofi', sex: 'male', age: 35, heightCm: 175, weightKg: 75, hideNumbers: false, health: { pregnant: false, diabetes: false, bloodPressure: false } } as unknown as Profile;

test('every plate is made of foods in the table', () => {
  for (const plate of PLATES) for (const [id] of plate.parts) expect([plate.id, food(id)?.id]).toEqual([plate.id, id]);
});

test('breakfast ideas include light cups and drinks, never stretched', () => {
  const seen = new Set<string>();
  for (let shuffle = 0; shuffle < 8; shuffle++) {
    for (const s of suggestMeals({ profile: p, days: {}, date: '2026-11-01', budget: 2200, proteinGoal: 80, slot: 'Breakfast', shuffle })) {
      seen.add(s.plate.id);
      for (const part of s.parts) {
        const f = food(part.foodId)!;
        const usual = s.plate.parts.find(([id]) => id === part.foodId)![1];
        if (['drink', 'porridge'].includes(f.category)) expect(part.grams).toBeLessThanOrEqual(Math.round((usual * 1.15) / 10) * 10);
      }
    }
  }
  const light = [...seen].filter((id) => /koko|tea|milo|oblayo|tom_brown|ovaltine|rice_water|millet|brukina/.test(id));
  expect(light.length).toBeGreaterThanOrEqual(3);
});

test('the first breakfast ideas are mostly cups and drinks, even when greens are favoured', () => {
  // BMI about 26: greens count extra at lunch and dinner, but shouldn't pull heavy plates into breakfast.
  const her = { ...p, name: 'Ama', sex: 'female', age: 34, heightCm: 163, weightKg: 70 } as Profile;
  const cup = (id: string) => PLATES.find((pl) => pl.id === id)!.parts.some(([f]) => ['drink', 'porridge'].includes(food(f)!.category));
  for (const date of ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05']) {
    for (const who of [p, her]) {
      const top = suggestMeals({ profile: who, days: {}, date, budget: 1750, proteinGoal: 60, slot: 'Breakfast' });
      expect(top.filter((s) => cup(s.plate.id)).length).toBeGreaterThanOrEqual(2);
    }
  }
});
