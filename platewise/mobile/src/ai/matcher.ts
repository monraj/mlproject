import { FOODS, type Food } from '../data/foods';

// Port of backend/app/nutrition/matcher.py so the phone matches names the same way the server does.
export const AUTO_ACCEPT = 0.75;

export type Match = { food: Food; score: number };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim();

/** Python's difflib.SequenceMatcher(None, a, b).ratio() (no junk heuristics, same for short strings). */
function ratio(a: string, b: string): number {
  if (!a.length && !b.length) return 1;
  const matched = (alo: number, ahi: number, blo: number, bhi: number): number => {
    let best = 0;
    let bi = alo;
    let bj = blo;
    for (let i = alo; i < ahi; i++) {
      for (let j = blo; j < bhi; j++) {
        let k = 0;
        while (i + k < ahi && j + k < bhi && a[i + k] === b[j + k]) k++;
        if (k > best) {
          best = k;
          bi = i;
          bj = j;
        }
      }
    }
    if (!best) return 0;
    return best + matched(alo, bi, blo, bj) + matched(bi + best, ahi, bj + best, bhi);
  };
  return (2 * matched(0, a.length, 0, b.length)) / (a.length + b.length);
}

function score(query: string, food: Food): number {
  const q = norm(query);
  if (!q) return 0;
  const names = [norm(food.name), norm(food.id.replace(/_/g, ' ')), ...food.aliases.map(norm)];
  const words = q.split(' ');
  let best = 0;
  for (const n of names) {
    if (q === n) return 1;
    let r = ratio(q, n);
    if (n && (words.includes(n) || (n.length > 3 && q.includes(n)))) r = Math.max(r, 0.8);
    if (q.length > 3 && n.includes(q)) r = Math.max(r, 0.78);
    best = Math.max(best, r);
  }
  return best;
}

export function matchFood(name: string, aliases: string[] = [], catalogId: string | null = null, limit = 5): Match[] {
  const scored = new Map<string, number>();
  for (const f of FOODS) scored.set(f.id, Math.max(score(name, f), ...aliases.map((a) => score(a, f) * 0.95)));
  if (catalogId && scored.has(catalogId)) {
    // The model's pick from the catalogue is a strong hint, but the name still has to agree.
    const s = scored.get(catalogId) as number;
    scored.set(catalogId, Math.max(s, 0.6 + 0.4 * s, 0.8));
  }
  const byId = new Map(FOODS.map((f) => [f.id, f]));
  return [...scored.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, limit)
    .filter(([, s]) => s > 0.3)
    .map(([id, s]) => ({ food: byId.get(id) as Food, score: Math.round(s * 1000) / 1000 }));
}
