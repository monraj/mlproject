import type { Day, Profile, Weight } from './types';

// What this person's body needs from the next meal, from their age, height, weight, sex and what
// Health Connect saw today (steps, exercise, sleep). Only steers which plates are suggested; it
// never changes the calorie budget (that's calc.ts) and never names a nutrient the food table
// doesn't have (CLAUDE.md rule 2).

export type Needs = {
  /** Protein to aim for today, in grams. */
  proteinG: number;
  /** How much protein counts when ranking plates (1 = usual). */
  proteinWeight: number;
  /** How much a plate with greens counts (1 = usual). */
  greensWeight: number;
  /** Starchy plates: gently fewer, as usual, or fine to have more. */
  starch: 'lighter' | 'usual' | 'more';
  /** Underweight: prefer fuller plates over light ones. */
  fuller: boolean;
  /** Women 19-50 need more iron: lean towards plates with leafy greens or beans. */
  iron: boolean;
  /** The main reason, in the person's terms, when one stands out. */
  reason: string | null;
};

// Iron: women 19-50 need about twice what men do (WHO/FAO 2004), and anaemia is common among
// Ghanaian women (GDHS 2022), so their plates lean towards leafy greens and beans. Chosen by food
// type only; the food table has no iron values to count.
const BEANS = new Set(['beans', 'rice_beans', 'beans_stew', 'soya_beans', 'bambara_beans', 'bean_leaf_soup']);
export const ironFriendly = (foodIds: string[], greens: boolean) => greens || foodIds.some((id) => BEANS.has(id));

// Protein per kg of body weight: 0.8 g for adults (WHO/FAO/UNU 2007); 1.0-1.2 g from about 65 to
// keep muscle (PROT-AGE 2013, ESPEN 2014); around 1.1 g in pregnancy (IOM DRI 2005).
const PROTEIN_PER_KG = { adult: 0.8, from50: 1.0, from65: 1.1, pregnant: 1.1 };
const ACTIVE_STEPS = 10000;
const ACTIVE_EXERCISE_MIN = 30;
const QUIET_STEPS = 3000;
const SHORT_SLEEP_MIN = 6 * 60;

export const bmiOf = (kg: number, cm: number) => (cm > 0 ? kg / (cm / 100) ** 2 : 0);

/** The latest weigh-in, or the profile's weight. */
export function currentKg(profile: Profile, weights: Weight[] = []): number {
  return weights.length ? weights[weights.length - 1].kg : profile.weightKg;
}

export function needsFor(profile: Profile, day: Day | undefined, weights: Weight[] = [], evening = false): Needs {
  const kg = currentKg(profile, weights);
  const bmi = bmiOf(kg, profile.heightCm);
  const pregnant = !!profile.health?.pregnant;
  const perKg = pregnant ? PROTEIN_PER_KG.pregnant : profile.age >= 65 ? PROTEIN_PER_KG.from65 : profile.age >= 50 ? PROTEIN_PER_KG.from50 : PROTEIN_PER_KG.adult;
  const w = day?.watch;
  const active = (w?.steps ?? 0) >= ACTIVE_STEPS || (w?.exerciseMin ?? 0) >= ACTIVE_EXERCISE_MIN;
  // Few steps only means a quiet day once the day is mostly over.
  const quiet = evening && w?.steps != null && w.steps < QUIET_STEPS && !(w.exerciseMin ?? 0);
  const shortSleep = w?.sleepMin != null && w.sleepMin > 0 && w.sleepMin < SHORT_SLEEP_MIN;
  const underweight = bmi > 0 && bmi < 18.5;
  const heavier = bmi >= 25;

  const needs: Needs = {
    proteinG: kg > 0 ? Math.round(kg * perKg) : 0,
    proteinWeight: perKg > PROTEIN_PER_KG.adult ? 1.5 : active ? 1.3 : 1,
    greensWeight: heavier || shortSleep ? 1.6 : 1,
    starch: active || underweight ? 'more' : quiet || (heavier && !pregnant) ? 'lighter' : 'usual',
    fuller: underweight,
    iron: profile.sex === 'female' && profile.age >= 19 && profile.age <= 50,
    reason: null,
  };
  needs.reason = pregnant
    ? 'Extra protein for you and baby'
    : profile.age >= 65
      ? 'Protein to keep your muscles strong'
      : active
        ? 'Fuel and protein after an active day'
        : underweight
          ? 'A filling plate to help you build up'
          : shortSleep
            ? 'A steady plate after a short night'
            : quiet
              ? 'Lighter on starch for a quieter day'
              : profile.age >= 50
                ? 'Protein to keep your muscles strong'
                : heavier
                  ? 'Greens to fill you up'
                  : needs.iron
                    ? 'Greens and beans for iron'
                    : null;
  return needs;
}
