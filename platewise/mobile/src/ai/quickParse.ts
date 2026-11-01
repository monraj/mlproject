import type { ScanResult } from '../api/client';
import { AUTO_ACCEPT, matchFood } from './matcher';
import { buildItem } from './pipeline';

// Typed meals with no AI at all (no server, no on-device model): split the text into foods and
// match each against the food table. Amounts come from what was typed or the table's usual
// portion, never a guess (CLAUDE.md rules 1 and 2). Weak matches ask the person to pick.

const SPLIT = /\s*(?:,|;|\+|&|\n|\band\b|\bwith\b|\bplus\b|\bna\b)\s*/i;
// Below this, a chunk isn't a food we know; it's dropped rather than shown as a wild guess.
const MIN_SCORE = 0.5;

export function parseWithoutAI(text: string): ScanResult {
  const chunks = text.split(SPLIT).map((c) => c.trim()).filter((c) => c.length > 1);
  const seen = new Set<string>();
  const items = [];
  for (const chunk of chunks) {
    const top = matchFood(chunk)[0];
    if (!top || top.score < MIN_SCORE || seen.has(top.food.id)) continue;
    seen.add(top.food.id);
    const sure = top.score >= AUTO_ACCEPT;
    const g = top.food.portionG;
    const ai = { food_name: sure ? top.food.name : chunk, catalog_id: sure ? top.food.id : null, grams_estimate: g, grams_low: g * 0.75, grams_high: g * 1.25, confidence: sure ? 0.7 : 0.4 };
    items.push(buildItem(ai, items.length, chunk));
  }
  return {
    isFood: items.length > 0,
    note: items.length ? null : 'Couldn\'t match that to foods in the table. Try names like "waakye" or "two balls of kenkey", or search for a food.',
    provider: 'food-table',
    items,
  };
}
