import type { Day, Profile, Weight } from './types';
import { dayKcal, macroTargets, weeklyRate } from './calc';
import { glucoseAdvice, readingsOf, stressRead } from './vitals';
import { kcal } from '../lib/format';

// The afternoon, evening and on-demand summary. Every fact here comes from the person's own log
// and watch, worked out in code; an AI may only re-word it (see reportFacts), never add numbers.

export type ReportPart = 'afternoon' | 'evening' | 'now';
export type ReportLine = { key: 'food' | 'protein' | 'greens' | 'water' | 'move' | 'sleep' | 'stress' | 'sugar' | 'weight'; label: string; text: string; tone: 'good' | 'info' | 'tip' };
export type Report = { part: ReportPart; date: string; title: string; lines: ReportLine[]; wins: string[]; next: string[]; urgent: string | null };

export const WATER_GOAL = 8;
export const STEPS_GOAL = 7000;
export const REPORT_TIMES: Record<'afternoon' | 'evening', number> = { afternoon: 14 * 60, evening: 20 * 60 };

const sleepText = (min: number) => `${Math.floor(min / 60)} h ${Math.round(min % 60)} min`;

/** Builds the report for `date`. `part` changes the framing: what's left today, or how the day went. */
export function buildReport(p: Profile, days: Record<string, Day>, weights: Weight[], date: string, budget: number, part: ReportPart, now = new Date()): Report {
  const d = days[date];
  const hide = p.hideNumbers;
  const evening = part === 'evening' || (part === 'now' && now.getHours() >= 18);
  const eaten = dayKcal(d);
  const left = budget - eaten;
  const meals = d?.meals.length ?? 0;
  const protein = Math.round(d?.meals.reduce((s, m) => s + m.protein, 0) ?? 0);
  const proteinGoal = macroTargets(budget).protein;
  const greens = (d?.meals.reduce((s, m) => s + m.greens, 0) ?? 0) + (d?.greensExtra ?? 0);
  const water = d?.water ?? 0;
  const steps = Math.max(d?.steps ?? 0, d?.watch?.steps ?? 0);
  const lines: ReportLine[] = [];
  const wins: string[] = [];
  const next: string[] = [];

  // Food
  if (!meals) {
    lines.push({ key: 'food', label: 'Food', text: 'Nothing logged yet today.', tone: 'tip' });
    next.push('Log what you have eaten so far; a quick typed note is enough.');
  } else {
    const share = Math.round((eaten / budget) * 100);
    const amount = hide ? `about ${share}% of your budget` : `${kcal(eaten)} of ${kcal(budget)} kcal`;
    const text = evening
      ? `${meals} ${meals === 1 ? 'meal' : 'meals'}, ${amount}.`
      : `${meals} ${meals === 1 ? 'meal' : 'meals'} so far, ${amount}. ${left > 0 ? (hide ? 'Room left for the rest of the day.' : `${kcal(left)} kcal left for the rest of the day.`) : 'You have used today’s budget; a light supper is plenty.'}`;
    const near = Math.abs(left) <= budget * 0.1;
    lines.push({ key: 'food', label: 'Food', text, tone: evening && near ? 'good' : 'info' });
    if (evening && near) wins.push('You stayed close to your budget today.');
    if (evening && left < -budget * 0.1) next.push('Over today, and that’s okay. Start tomorrow with a protein breakfast like eggs or koko with groundnuts.');
  }

  if (meals) {
    const ok = protein >= proteinGoal * (evening ? 0.85 : 0.45);
    lines.push({ key: 'protein', label: 'Protein', text: hide ? (ok ? 'On track.' : 'Lower than your goal so far.') : `${protein} of ${proteinGoal} g.`, tone: ok ? 'good' : 'tip' });
    if (ok && evening) wins.push('Good protein today.');
    if (!ok) next.push(evening ? 'Add fish, eggs, beans or chicken to one more meal tomorrow.' : 'Put fish, eggs, beans or chicken in your next meal.');
  }

  lines.push({ key: 'greens', label: 'Greens', text: `${greens} of 3 servings.`, tone: greens >= 3 ? 'good' : greens ? 'info' : 'tip' });
  if (greens >= 3) wins.push('Three servings of greens.');
  else if (!evening) next.push('Add kontomire, garden eggs, okro or a salad at your next meal.');

  lines.push({ key: 'water', label: 'Water', text: `${water} of ${WATER_GOAL} cups.`, tone: water >= WATER_GOAL ? 'good' : 'info' });
  if (water >= WATER_GOAL) wins.push('You hit your water goal.');
  else if (!evening && water < 4) next.push('Have a glass of water now; thirst often feels like hunger.');

  // Movement and sleep
  if (steps || d?.watch?.exerciseMin) {
    const ex = d?.watch?.exerciseMin ? `, ${d.watch.exerciseMin} min exercise` : '';
    lines.push({ key: 'move', label: 'Movement', text: `${kcal(steps)} steps${ex}.`, tone: steps >= STEPS_GOAL ? 'good' : 'info' });
    if (steps >= STEPS_GOAL) wins.push(`${kcal(steps)} steps.`);
    else if (!evening) next.push('A 10-minute walk after your next meal also helps your blood sugar.');
  }
  if (d?.watch?.sleepMin) {
    const short = d.watch.sleepMin < 6 * 60;
    lines.push({ key: 'sleep', label: 'Sleep', text: `${sleepText(d.watch.sleepMin)} last night.`, tone: short ? 'tip' : 'good' });
    if (short && evening) next.push('Aim for bed a little earlier tonight; short sleep raises hunger the next day.');
  }

  // Stress
  const stress = stressRead(days, date);
  if (stress) {
    const word = { calm: 'Calm', usual: 'About your usual', raised: 'Under some strain' }[stress.level];
    lines.push({ key: 'stress', label: 'Stress', text: stress.reasons.length ? `${word}: ${stress.reasons.join(', ')}.` : `${word}.`, tone: stress.level === 'raised' ? 'tip' : 'good' });
    if (stress.level === 'raised') next.push('Take 2 minutes of slow breathing (in for 4, out for 6) on the Body signals page.');
  }

  // Blood sugar
  const sugar = readingsOf(d);
  let urgent: string | null = null;
  if (sugar.length) {
    const advice = sugar.map((g) => glucoseAdvice(g));
    const usual = advice.filter((a) => a.band === 'usual').length;
    const last = sugar[sugar.length - 1];
    lines.push({ key: 'sugar', label: 'Blood sugar', text: `${sugar.length} ${sugar.length === 1 ? 'reading' : 'readings'}, ${usual} in the usual range. Latest ${last.mmol} mmol/L.`, tone: usual === sugar.length ? 'good' : 'tip' });
    urgent = advice.find((a) => a.urgent)?.text ?? null;
    const high = advice.filter((a) => a.band === 'high').length;
    if (high) next.push('Some readings were high. Smaller portions of rice, gari, kenkey or fufu with more vegetables help; if they stay high, see a doctor or nurse.');
  } else if (p.health?.diabetes) {
    next.push('Check your blood sugar as your doctor advised and add it on the Body signals page.');
  }

  // Weight trend: only at the end of the day, it doesn't change by the hour.
  if (evening) {
    const rate = weeklyRate(weights);
    if (rate != null) {
      const down = rate < -0.05;
      lines.push({ key: 'weight', label: 'Weight trend', text: down ? `Going down about ${Math.abs(rate).toFixed(1)} kg a week.` : rate > 0.05 ? `Up about ${rate.toFixed(1)} kg a week.` : 'Steady.', tone: down ? 'good' : 'info' });
      if (down) wins.push('Your weight trend is heading the right way.');
    }
  }

  const title = part === 'afternoon' ? 'Afternoon check-in' : part === 'evening' ? 'Your day in review' : evening ? 'Your day so far' : 'Right now';
  return { part, date, title, lines, wins: wins.slice(0, 3), next: [...new Set(next)].slice(0, 3), urgent };
}

/**
 * The report as plain facts for an AI to re-word. No name, email, age or photo: only numbers
 * and the lines above, so nothing identifies the person.
 */
export function reportFacts(r: Report): string {
  return [
    `${r.title}.`,
    ...r.lines.map((l) => `${l.label}: ${l.text}`),
    r.wins.length ? `Wins: ${r.wins.join(' ')}` : '',
    r.next.length ? `Next: ${r.next.join(' ')}` : '',
    r.urgent ? `Urgent: ${r.urgent}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export const REPORT_SYSTEM =
  'You are PlateWise, a warm health coach in Ghana. Re-word the facts below into a short, encouraging summary of 3 to 4 sentences, speaking to the person as "you". ' +
  'Use only the facts given: never add a number, food, diagnosis or medicine that is not in them. Never shame. If there is an Urgent line, say it first, word for word.';
