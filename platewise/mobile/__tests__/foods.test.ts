import fs from 'fs';
import path from 'path';
import { FOODS, food, searchFoods } from '../src/data/foods';

describe('food table', () => {
  it('is the same file as the backend copy (run npm run sync-foods)', () => {
    const backend = fs.readFileSync(path.join(__dirname, '../../backend/app/nutrition/foods.json'), 'utf8');
    const mobile = fs.readFileSync(path.join(__dirname, '../src/data/foods.json'), 'utf8');
    expect(mobile).toBe(backend);
  });

  it('finds Ghanaian dishes by name and alias', () => {
    expect(searchFoods('kenkey')[0].id).toBe('kenkey');
    expect(searchFoods('cow skin')[0].id).toBe('wele');
    expect(food('waakye')?.portionLabel).toBe('1 plate');
    expect(FOODS.length).toBeGreaterThan(50);
  });
});
