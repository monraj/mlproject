import type { Day, Profile, Weight } from '../state/types';
import { FAST_HOURS, fastingBlock } from '../state/calc';
import { STRESS_TIPS, glucoseAdvice, heartOf, readingsOf, stressRead } from '../state/vitals';
import { buildReport } from '../state/report';
import { nextSlot, suggestMeals } from '../state/suggest';
import { food } from '../data/foods';

// The extra pages and watch-face shortcuts on the Pixel Watch: body signals, the summary, the
// fasting window and a meal idea. Worked out on the phone; the watch only displays them. Stays on
// the user's own phone and watch (the Data Layer), never a server.

const STRESS_WORD = { calm: 'Calm', usual: 'About usual', raised: 'Some strain' } as const;

export function watchSignals(args: { profile: Profile; days: Record<string, Day>; weights: Weight[]; date: string; budget: number; proteinGoal: number; now?: Date }) {
  const { profile, days, weights, date, budget, proteinGoal } = args;
  const now = args.now ?? new Date();
  const day = days[date];
  const stress = stressRead(days, date);
  const sugar = readingsOf(day).slice(-1)[0];
  const advice = sugar ? glucoseAdvice(sugar) : null;
  const heart = heartOf(day?.watch);
  const report = buildReport(profile, days, weights, date, budget, 'now', now);
  const f = profile.fasting;
  const fastOk = !!f?.on && !fastingBlock(profile, f);
  const slot = nextSlot(day, now);
  const idea = suggestMeals({ profile, days, weights, date, budget, proteinGoal, slot, limit: 1 })[0];
  return {
    stress: {
      level: stress?.level ?? null,
      word: stress ? STRESS_WORD[stress.level] : 'Check in',
      tip: stress ? STRESS_TIPS[stress.level] : 'How do you feel? Tap a number.',
      checkIn: stress?.checkIn?.level ?? null,
    },
    sugar: sugar && advice ? { mmol: sugar.mmol, usual: advice.band === 'usual', urgent: advice.urgent ? advice.text : null, at: sugar.at } : null,
    heart: { resting: heart?.resting ?? null, hrv: heart?.hrv ?? null },
    report: {
      title: report.title,
      urgent: report.urgent,
      lines: report.lines.slice(0, 5).map((l) => ({ label: l.label, text: l.text, good: l.tone === 'good' })),
      next: report.next.slice(0, 2),
    },
    fast: fastOk && f ? { eatFrom: f.eatFrom, eatHours: 24 - FAST_HOURS[f.plan] } : null,
    idea: idea
      ? {
          slot: slot === 'Dinner' ? 'Supper' : slot,
          name: idea.plate.name,
          kcal: profile.hideNumbers ? null : idea.kcal,
          parts: idea.parts.map((p) => food(p.foodId)?.name ?? p.foodId).slice(0, 3),
        }
      : null,
  };
}

/** A stress check-in tapped on the watch arrives as a log request with ref "stress:<level>:<ms>". */
export function parseStressRef(ref: string): { level: 1 | 2 | 3 | 4 | 5; at: string } | null {
  const [kind, level, ms] = ref.split(':');
  const n = Number(level);
  const t = Number(ms);
  if (kind !== 'stress' || !(n >= 1 && n <= 5) || !Number.isFinite(t)) return null;
  return { level: Math.round(n) as 1 | 2 | 3 | 4 | 5, at: new Date(t).toISOString() };
}
