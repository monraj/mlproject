import { matchFood } from './matcher';

/**
 * Foods named in the question, with what PlateWise's food table says about them. A small model
 * otherwise fills gaps from memory (e.g. "maize in red-red"); grounding it in the table fixes that.
 */
export function foodFacts(question: string, max = 4): string[] {
  const words = question.toLowerCase().replace(/[^a-z0-9 -]+/g, ' ').split(/\s+/).filter(Boolean);
  const terms = [...words.map((w, i) => (i < words.length - 1 ? `${w} ${words[i + 1]}` : '')), ...words].filter((t) => t.length >= 4);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of terms) {
    const top = matchFood(t, [], null, 1)[0];
    if (!top || top.score < 0.9 || seen.has(top.food.id)) continue;
    seen.add(top.food.id);
    const f = top.food;
    // Give whole-portion numbers: small models misapply "per 100 g" figures.
    const per = (v: number | null) => (v == null ? null : Math.round((v * f.portionG) / 100));
    const kcal = per(f.per100.kcal);
    const protein = per(f.per100.protein);
    const numbers = kcal != null ? `, about ${kcal} kcal${protein != null ? ` and ${protein} g protein` : ''}` : '';
    const sure = { proxy: ' These figures come from a similar West African dish, so treat them as a guide.', estimate: ' No published figures exist for this dish yet; these are PlateWise estimates.' }[f.confidence as string] ?? '';
    out.push(`${f.name} (${f.detail}): a usual portion is ${f.portionLabel}, about ${f.portionG} g${numbers}.${sure}`);
    if (out.length >= max) break;
  }
  return out;
}

const AMOUNT = /(\d[\d,.]*)(?:\s?(?:-|–|to)\s?(\d[\d,.]*))?\s?(?:kcal|calories|cal|g\b|grams?)/gi;

/**
 * Removes calorie and gram figures the model made up. A number is kept only if it appears in what
 * the model was given (food-table facts, the person's data); otherwise its clause is dropped.
 */
export function stripUnverifiedNumbers(reply: string, given: string): string {
  // Dates aren't nutrition figures; don't let "2026-10-30" vouch for a made-up "30 g".
  const allowed = new Set((given.replace(/\d{4}-\d{2}-\d{2}/g, ' ').match(/\d[\d,.]*/g) ?? []).map((n) => n.replace(/,/g, '')));
  const known = (n?: string) => !n || allowed.has(n.replace(/,/g, '').replace(/\.$/, ''));
  const unverified = (text: string) => [...text.matchAll(AMOUNT)].some((m) => !known(m[1]) || !known(m[2]));
  const clean = (paragraph: string) => {
    const noParens = paragraph.replace(/\s*\([^)]*\)/g, (p) => (unverified(p) ? '' : p));
    const sentences = noParens.match(/[^.!?]+[.!?]*/g) ?? [noParens];
    return sentences
      .map((s) => {
        if (!unverified(s)) return s;
        const parts = s.split(/\s+[–—-]\s+|,\s+/);
        if (unverified(parts[0])) return '';
        const keep = [parts[0]];
        for (const p of parts.slice(1)) {
          if (unverified(p)) break;
          keep.push(p);
        }
        return `${keep.join(', ').replace(/[.!?\s]+$/, '')}.`;
      })
      .filter((s) => s.trim())
      .join(' ')
      .replace(/[ \t]+/g, ' ')
      .trim();
  };
  // Paragraph by paragraph, so line breaks survive.
  const cleaned = reply.split(/\n\s*\n|\n/).map(clean).filter(Boolean).join('\n\n');
  return cleaned || reply.replace(AMOUNT, '').trim();
}
