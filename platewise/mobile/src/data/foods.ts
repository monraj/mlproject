import raw from './foods.json';
import type { Candidate, Per100 } from '../state/types';

// Copied from backend/app/nutrition/foods.json by `npm run sync-foods`; a test keeps them identical.
// Values are DRAFT (needs_review) until checked against USDA / FAO WAFCT (CLAUDE.md rule 2).

export type Food = {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  detail: string;
  per100: Per100;
  portionG: number;
  portionLabel: string;
  countG: number | null;
  oily: boolean;
  greens: boolean;
};

type RawFood = (typeof raw.foods)[number];

export const FOODS: Food[] = raw.foods.map((f: RawFood) => ({
  id: f.id,
  name: f.name,
  aliases: f.aliases,
  category: f.category,
  detail: f.detail,
  per100: { kcal: f.kcal_per_100g, protein: f.protein_g, carbs: f.carbs_g, fat: f.fat_g },
  portionG: f.typical_portion_g,
  portionLabel: f.typical_portion_label,
  countG: f.count_g ?? null,
  oily: f.oily,
  greens: f.greens,
}));

const BY_ID = new Map(FOODS.map((f) => [f.id, f]));

export function food(id: string | null | undefined): Food | undefined {
  return id ? BY_ID.get(id) : undefined;
}

export function searchFoods(q: string, extra: Food[] = [], limit = 8): Food[] {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const all = [...extra, ...FOODS];
  return all
    .map((f) => {
      const hay = [f.name, f.id.replace(/_/g, ' '), ...f.aliases].join(' ').toLowerCase();
      const hit = words.every((w) => hay.includes(w));
      const starts = f.name.toLowerCase().startsWith(words[0]) ? 1 : 0;
      return { f, score: hit ? 1 + starts : 0 };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.f);
}

export function asCandidate(f: Food): Candidate {
  return { foodId: f.id, name: f.name, detail: f.detail };
}

/** Packaged products the person has scanned, as foods. */
export function productFoods(products: Record<string, import('../state/types').Product>): Food[] {
  return Object.values(products).map((p) => ({
    id: `p:${p.code}`,
    name: p.name,
    aliases: [p.code],
    category: 'product',
    detail: `Packaged · ${p.servingLabel}`,
    per100: p.per100,
    portionG: p.servingG,
    portionLabel: p.servingLabel,
    countG: null,
    oily: false,
    greens: false,
  }));
}

/** A fresh, editable item for a food the person picked themselves. */
export function draftFromFood(f: Food, grams?: number): import('../state/types').DraftItem {
  const g = Math.round(grams ?? f.portionG);
  const count = f.countG ? Math.max(1, Math.round(g / f.countG)) : undefined;
  return {
    id: `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    name: f.name,
    hint: 'Your pick',
    foodId: f.id,
    aiFoodId: null,
    aiGrams: g,
    grams: g,
    gramsLow: Math.round(g * 0.8),
    gramsHigh: Math.round(g * 1.2),
    per100: f.per100,
    uncertainty: 0.15,
    confidence: 'ok',
    kind: f.countG ? 'count' : f.oily ? 'oil' : 'grams',
    count,
    countG: f.countG,
    oil: 'normal',
    oily: f.oily,
    greens: f.greens,
    candidates: [],
  };
}
