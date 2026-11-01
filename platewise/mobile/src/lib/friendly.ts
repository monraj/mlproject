import { food as foodById, type Food } from '../data/foods';
import type { DraftItem } from '../state/types';

// Plain words for what a scan found: "about 1½ ladles" instead of "312 g". Built from the food
// table's usual portion, so it says nothing the numbers don't.

const NO_PLURAL = new Set(['fish', 'half', 'side', 'medium', 'small dish', 'portion', 'tbsp', 'tsp']);

function singular(unit: string): string {
  if (/oes$/.test(unit)) return unit.slice(0, -2);
  if (/s$/.test(unit) && !/ss$/.test(unit)) return unit.slice(0, -1);
  return unit;
}

function plural(unit: string): string {
  if (NO_PLURAL.has(unit) || unit.includes(',')) return unit;
  if (/(o|sh|ch)$/.test(unit)) return `${unit}es`;
  return `${unit}s`;
}

/** "2 balls" → { n: 2, unit: "ball" }; "1/2 cup" → { n: 0.5, unit: "cup" }. */
export function parsePortion(label: string): { n: number; unit: string } | null {
  const m = label.trim().match(/^(\d+\/\d+|\d+(?:\.\d+)?|half)\s*(.*)$/i);
  if (!m) return null;
  const n = m[1].toLowerCase() === 'half' ? 0.5 : m[1].includes('/') ? Number(m[1].split('/')[0]) / Number(m[1].split('/')[1]) : Number(m[1]);
  const unit = singular(m[2].trim() || 'portion');
  return n > 0 ? { n, unit } : null;
}

function halves(x: number): string {
  const r = Math.max(0.5, Math.round(x * 2) / 2);
  const whole = Math.floor(r);
  return r === 0.5 ? '½' : `${whole}${r - whole ? '½' : ''}`;
}

/** "about 1½ ladles", "2 balls", or "about 180 g" when the food has no countable portion. */
export function friendlyAmount(item: Pick<DraftItem, 'grams' | 'kind' | 'count' | 'foodId'>, f: Food | undefined = item.foodId ? foodById(item.foodId) : undefined): string {
  const p = f ? parsePortion(f.portionLabel) : null;
  if (item.kind === 'count' && item.count && p) {
    return `${item.count} ${item.count === 1 ? p.unit : plural(p.unit)}`;
  }
  if (f && p && f.portionG > 0) {
    const units = item.grams / (f.portionG / p.n);
    const text = halves(units);
    return `about ${text} ${units > 1.25 ? plural(p.unit) : p.unit}`;
  }
  return `about ${Math.round(item.grams / 10) * 10} g`;
}

function list(parts: string[]): string {
  return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** One or two warm sentences about the plate, e.g. "I can see waakye (about 1 plate) and 1 egg." */
export function friendlySummary(items: DraftItem[]): string {
  if (!items.length) return '';
  const seen = list(items.map((i) => `${i.name.toLowerCase()} (${friendlyAmount(i)})`));
  const unsure = items.filter((i) => i.confidence === 'low').map((i) => i.name.toLowerCase());
  const check = unsure.length ? ` I’m not fully sure about ${list(unsure)}, so take a quick look on the next page.` : ' Tap Next to check the portions and save.';
  return `I can see ${seen}.${check}`;
}
