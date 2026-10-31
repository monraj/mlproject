import type { Food } from '../data/foods';

export type PortionPreset = { label: string; grams: number };

const MULTIPLES = [0.5, 1, 1.5, 2] as const;

const plural = (unit: string) => (/(s|sh|ch|x)$/.test(unit) ? `${unit}es` : `${unit}s`);
const singular = (unit: string) => (/(sses|shes|ches|xes)$/.test(unit) ? unit.slice(0, -2) : unit.endsWith('s') && !unit.endsWith('ss') ? unit.slice(0, -1) : unit);

/** "1 ball", "2 balls", "half" → quick portion chips built from the food table's typical portion. */
export function portionPresets(food: Pick<Food, 'portionG' | 'portionLabel'>): PortionPreset[] {
  const m = /^(\d+(?:\.\d+)?)\s+(.+)$/.exec(food.portionLabel.trim());
  if (!m) return [{ label: `1 ${food.portionLabel}`, grams: food.portionG }];
  const n = Number(m[1]);
  const unit = n > 1 ? singular(m[2]) : m[2];
  const perUnit = food.portionG / n;
  // Small multi-piece portions ("3 pieces", "6 slices") read better as unit counts than as halves.
  const counts = n > 1 ? [1, n, n * 2] : MULTIPLES;
  return counts.map((k) => ({
    label: `${k === 0.5 ? '½' : k === 1.5 ? '1½' : k} ${k > 1 ? plural(unit) : unit}`,
    grams: Math.round((perUnit * k) / 5) * 5,
  }));
}

/** "Sharing one bowl?" choices: the part of the whole dish that was yours. */
export const SHARES = [
  { label: 'All mine', value: 1 },
  { label: '½', value: 1 / 2 },
  { label: '⅓', value: 1 / 3 },
  { label: '¼', value: 1 / 4 },
] as const;
