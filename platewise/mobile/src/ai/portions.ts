import type { Food } from '../data/foods';

// Port of backend/app/nutrition/portions.py: read stated amounts ("two balls of kenkey", "half a
// plate of jollof") from what the person said, so grams come from the food table, not a guess.

const NUMBERS: Record<string, number> = {
  a: 1, an: 1, one: 1, single: 1, two: 2, three: 3, four: 4, five: 5, six: 6, half: 0.5, '1/2': 0.5, quarter: 0.25, couple: 2,
};
const UNITS = ['ball', 'plate', 'bowl', 'piece', 'slice', 'cup', 'mug', 'pack', 'handful', 'ladle', 'tbsp', 'tablespoon', 'spoon', 'wrap', 'finger', 'stick', 'bottle', 'can', 'egg', 'fish', 'portion', 'serving', 'medium', 'side'];
const SIZE: Record<string, number> = { small: 0.75, big: 1.35, large: 1.35, full: 1, generous: 1.2 };

const byLength = (xs: string[]) => [...xs].sort((a, b) => b.length - a.length).map((x) => x.replace(/[/.]/g, '\\$&'));
const QTY = `(\\d+(?:\\.\\d+)?|${byLength(Object.keys(NUMBERS)).join('|')})`;
const UNIT = `(${byLength(UNITS).join('|')})(?:e?s)?`;

const singular = (w: string) => {
  const s = w.toLowerCase();
  if (s.endsWith('ches') || s.endsWith('shes')) return s.slice(0, -2);
  return s.endsWith('s') && !s.endsWith('ss') ? s.slice(0, -1) : s;
};
const qty = (w: string) => (/^\d+(\.\d+)?$/.test(w) ? Number(w) : NUMBERS[w.toLowerCase()]);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function names(food: Food): string[] {
  const all = new Set([food.name.toLowerCase(), food.id.replace(/_/g, ' '), ...food.aliases.map((a) => a.toLowerCase())]);
  for (const n of [...all]) all.add(n.split(/[,(]/)[0].trim());
  return [...all].filter((n) => n.length >= 3).sort((a, b) => b.length - a.length);
}

function perUnit(food: Food, unit0: string): number | null {
  const m = /^(\d+(?:\.\d+)?)\s+(.+)$/.exec(food.portionLabel);
  const [n, labelUnit] = m ? [Number(m[1]), singular(m[2])] : [1, singular(food.portionLabel)];
  const unit = ({ tablespoon: 'tbsp', spoon: 'tbsp', serving: 'portion' } as Record<string, string>)[unit0] ?? unit0;
  if (unit === labelUnit) return food.portionG / n;
  if (unit === 'piece' && food.countG) return food.countG;
  if (unit === 'portion' || (['plate', 'bowl'].includes(unit) && ['plate', 'bowl', 'portion'].includes(labelUnit))) return food.portionG / n;
  return null;
}

function wholeItem(food: Food, name: string): number | null {
  if (food.countG) return food.countG;
  if (food.portionLabel.trim().toLowerCase() === 'half') return food.portionG * 2;
  return perUnit(food, singular(name.split(' ').pop() ?? ''));
}

/** Grams the person stated for this food, or null when no amount can be read. */
export function statedGrams(text: string, food: Food): number | null {
  const low = ` ${text.toLowerCase().replace(/[^a-z0-9/. -]+/g, ' ')} `;
  for (const name of names(food)) {
    const re = new RegExp(`(?<![a-z])${escape(name)}(?![a-z])`, 'g');
    for (const hit of low.matchAll(re)) {
      const window = low.slice(0, hit.index).trim().split(/\s+/).slice(-6).join(' ');
      const withUnit = new RegExp(`${QTY}(?:\\s+a)?(?:\\s+(small|big|large|full|generous))?\\s+${UNIT}(?:\\s+of)?(?:\\s+\\w+)?$`).exec(window);
      if (withUnit) {
        const per = perUnit(food, singular(withUnit[3]));
        if (per) return qty(withUnit[1]) * (SIZE[withUnit[2] ?? ''] ?? 1) * per;
      }
      const bare = new RegExp(`(?:(half)\\s+(?:a|an)|${QTY})(?:\\s+(?:boiled|fried|grilled|small|big|large))?$`).exec(window);
      const whole = wholeItem(food, name);
      if (bare && whole) return (bare[1] ? 0.5 : qty(bare[2])) * whole;
    }
  }
  return null;
}
