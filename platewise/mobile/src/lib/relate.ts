import { food } from '../data/foods';

// Calories in terms people already understand. See reports/Ghanaian food calories database.md:
// share of the day is the main framing; a familiar food is the second; walking time is opt-in and
// worded as energy the food gives (never "burn it off"), because exercise framings can harm people
// with disordered eating.

const SHARES: [number, string][] = [
  [0.1, 'a tenth'],
  [1 / 6, 'a sixth'],
  [0.2, 'a fifth'],
  [0.25, 'a quarter'],
  [1 / 3, 'a third'],
  [0.4, 'two-fifths'],
  [0.5, 'half'],
  [2 / 3, 'two-thirds'],
  [0.75, 'three-quarters'],
  [1, 'all'],
];

/** "about a third of your day" */
export function shareOfDay(kcal: number, budget: number): string | null {
  if (!budget || kcal <= 0) return null;
  const s = kcal / budget;
  if (s < 0.07) return 'a small part of your day';
  if (s > 1.15) return 'more than your whole day';
  const [, words] = SHARES.reduce((best, cur) => (Math.abs(cur[0] - s) < Math.abs(best[0] - s) ? cur : best));
  return words === 'all' ? 'about your whole day' : `about ${words} of your day`;
}

const half = (n: number) => Math.round(n * 2) / 2;
const say = (n: number) => (n % 1 ? `${Math.floor(n) || ''}½`.replace(/^½/, '½') : `${n}`);

function unitKcal(id: string, grams?: number): { kcal: number; grams: number } | null {
  const f = food(id);
  if (!f || f.per100.kcal == null) return null;
  const g = grams ?? f.countG ?? f.portionG;
  return { kcal: (f.per100.kcal * g) / 100, grams: g };
}

/** "about as much energy as 1½ balls of kenkey" (or slices of bread for small amounts). */
export function familiarFood(kcal: number): string | null {
  if (kcal < 40) return null;
  const kenkey = unitKcal('kenkey');
  if (kenkey) {
    // Kenkey from about half a ball up; smaller amounts read better as slices of bread.
    const n = half(kcal / kenkey.kcal);
    if (kcal / kenkey.kcal >= 0.45) return `about as much energy as ${say(n)} ${n > 1 ? 'balls' : 'ball'} of kenkey`;
  }
  const slice = unitKcal('bread', 30); // one slice of bread is about 30 g
  if (!slice) return null;
  const n = Math.max(1, Math.round(kcal / slice.kcal));
  return `about as much energy as ${n} ${n > 1 ? 'slices' : 'slice'} of bread`;
}

// Compendium of Physical Activities 2024, code 17200 (brisk walking, 4.8 MET). Net of resting
// energy (MET - 1), so it is the extra energy the walk uses.
const BRISK_WALK_NET_MET = 4.8 - 1;

/** "energy for about 90 minutes of brisk walking", personalised to body weight. */
export function walkingTime(kcal: number, weightKg: number): string | null {
  if (kcal <= 0 || !weightKg) return null;
  const minutes = (kcal / (BRISK_WALK_NET_MET * weightKg)) * 60;
  if (minutes < 5) return null;
  if (minutes >= 90) {
    const hours = Math.round(minutes / 30) / 2;
    return `energy for about ${say(hours)} ${hours > 1 ? 'hours' : 'hour'} of brisk walking`;
  }
  return `energy for about ${Math.round(minutes / 5) * 5} minutes of brisk walking`;
}

/** Lines to show under a meal's calories. */
export function relate(kcal: number, budget: number, opts: { weightKg?: number; showWalking?: boolean; hideNumbers?: boolean } = {}): string[] {
  const out = [shareOfDay(kcal, budget), opts.hideNumbers ? null : familiarFood(kcal)];
  if (opts.showWalking && opts.weightKg) out.push(walkingTime(kcal, opts.weightKg));
  return out.filter((x): x is string => !!x);
}
