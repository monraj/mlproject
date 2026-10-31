import { FOODS } from '../data/foods';
import { matchFood } from '../ai/matcher';

// Speech-to-text often misspells Ghanaian dish names ("wakye", "kelewelle"). Before the transcript
// goes to the AI, swap near-misses for the food table's own spelling. Exact words are left alone.

const CLOSE = 0.85;
const MIN_LEN = 4;

const known = new Set(FOODS.flatMap((f) => [f.name, f.id.replace(/_/g, ' '), ...f.aliases].map((n) => n.toLowerCase())));

export function fixDishWords(text: string): string {
  return text.replace(/[A-Za-z][A-Za-z'-]*/g, (word) => {
    const w = word.toLowerCase();
    if (w.length < MIN_LEN || known.has(w)) return word;
    const top = matchFood(w, [], null, 1)[0];
    if (!top || top.score < CLOSE || top.score >= 1) return word;
    // Only single-word names, so "jolof" → "jollof" but never one word into a phrase.
    const names = [top.food.name, ...top.food.aliases].filter((n) => !n.includes(' '));
    const best = names.sort((a, b) => Math.abs(a.length - w.length) - Math.abs(b.length - w.length))[0];
    return best ? best.toLowerCase() : word;
  });
}
