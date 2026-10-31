import { itemKcal } from '../state/calc';
import type { DraftItem } from '../state/types';

// One targeted question per scan, only where the answer moves the total most. Asking about
// everything didn't help in field studies; asking about the biggest uncertain item can.

export type Question = { itemId: string; kind: 'identity' | 'oil'; text: string };

/** Share of the meal's energy an item must carry before it's worth a question. */
const MIN_SHARE = 0.2;

export function pickQuestion(items: DraftItem[]): Question | null {
  const total = items.reduce((s, i) => s + itemKcal(i).mid, 0);
  if (!total) return null;
  const big = (i: DraftItem) => itemKcal(i).mid / total >= MIN_SHARE;
  const byKcal = [...items].sort((a, b) => itemKcal(b).mid - itemKcal(a).mid);

  const unsure = byKcal.find((i) => i.foodId && i.confidence === 'low' && big(i));
  if (unsure) return { itemId: unsure.id, kind: 'identity', text: `Is this ${unsure.name.toLowerCase()}?` };

  // Oil is where photo estimates miss most, so ask about the biggest oily dish.
  const oily = byKcal.find((i) => i.kind === 'oil' && big(i));
  if (oily) return { itemId: oily.id, kind: 'oil', text: `How oily was the ${oily.name.toLowerCase()}?` };
  return null;
}
