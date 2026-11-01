import type { Fasting, FastingPlan } from './types';
import { FAST_HOURS } from './calc';

// Time-restricted eating, traditional foods and herbs. Guidance only: no cure claims, and safety
// comes first (the checks live in calc.ts, mirrored from backend/app/safety/rules.py).

export const PLANS: { plan: FastingPlan; label: string; detail: string }[] = [
  { plan: '12:12', label: '12 : 12', detail: 'Overnight. A gentle start: no late-night eating.' },
  { plan: '14:10', label: '14 : 10', detail: 'Supper a little earlier, breakfast a little later.' },
  { plan: '16:8', label: '16 : 8', detail: 'Two meals in an 8-hour window. Only once 14:10 feels easy.' },
];

export const DEFAULT_FASTING: Fasting = { on: false, plan: '12:12', eatFrom: '08:00', eatingDisorder: false, meds: 'none', doctorOk: false, remind: true };

export type FastWindow = { eating: boolean; start: Date; end: Date; progress: number; minutesLeft: number };

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

function at(day: Date, minute: number): Date {
  const d = new Date(day);
  d.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
  return d;
}

const HOUR = 3600000;

/** Whether it is eating time or fasting time right now, and how far through that stretch. */
export function fastWindow(f: Pick<Fasting, 'plan' | 'eatFrom'>, now = new Date()): FastWindow {
  const eatMs = (24 - FAST_HOURS[f.plan]) * HOUR;
  let open = at(now, toMinutes(f.eatFrom));
  if (open > now) open = new Date(open.getTime() - 24 * HOUR);
  const close = new Date(open.getTime() + eatMs);
  const eating = now < close;
  const start = eating ? open : close;
  const end = eating ? close : new Date(open.getTime() + 24 * HOUR);
  const span = end.getTime() - start.getTime();
  return { eating, start, end, progress: Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / span)), minutesLeft: Math.max(0, Math.round((end.getTime() - now.getTime()) / 60000)) };
}

export function eatUntil(f: Pick<Fasting, 'plan' | 'eatFrom'>): string {
  const m = (toMinutes(f.eatFrom) + (24 - FAST_HOURS[f.plan]) * 60) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export type FastReminder = { date: Date; title: string; body: string; url: string };

/** Reminders at the opening and closing of the eating window for 3 days, plus a mid-fast sugar check with diabetes. */
export function planFasting(f: Fasting | undefined, diabetes: boolean, now = new Date()): FastReminder[] {
  if (!f?.on || !f.remind) return [];
  const out: FastReminder[] = [];
  const open = toMinutes(f.eatFrom);
  const close = open + (24 - FAST_HOURS[f.plan]) * 60;
  for (let i = 0; i < 3; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);
    const items: FastReminder[] = [
      { date: at(day, open), title: 'Eating window open', body: 'Start with water, then a meal with protein and greens.', url: '/plan' },
      { date: at(day, close - 30), title: 'Eating window closes in 30 minutes', body: 'Have your last meal or snack now if you’re hungry.', url: '/plan' },
    ];
    if (diabetes) items.push({ date: at(day, open - 120), title: 'Quick sugar check?', body: `If it’s under 3.9 mmol/L, eat now: 15 g of fast sugar, then recheck in 15 minutes.`, url: '/vitals' });
    out.push(...items.filter((r) => r.date > now));
  }
  return out;
}

// ---- What to eat: everyday Ghanaian foods that help with weight and blood sugar ----

export const TRADITIONAL: { foodId: string; why: string }[] = [
  { foodId: 'kontomire_leaves', why: 'Leafy, filling and light. Make the stew with less oil.' },
  { foodId: 'garden_egg', why: 'Garden eggs are low in calories and high in fibre.' },
  { foodId: 'beans_stew', why: 'Beans give protein and slow-release starch; kind to blood sugar.' },
  { foodId: 'local_rice', why: 'Unpolished local rice keeps more fibre than white rice.' },
  { foodId: 'ayoyo', why: 'With TZ, a big bowl of ayoyo soup fills you up for fewer calories.' },
  { foodId: 'tilapia', why: 'Grilled fish is lean protein. It keeps you full through a fast.' },
  { foodId: 'guinea_fowl', why: 'Leaner than most chicken, and a northern favourite.' },
  { foodId: 'roasted_plantain', why: 'Roasted, not fried: the same plantain with far less oil.' },
  { foodId: 'groundnuts', why: 'A small handful (about 20 g) keeps hunger away. Easy to overdo.' },
  { foodId: 'light_soup', why: 'A broth-based soup, filling for its calories.' },
];

// ---- Herbs and drinks: what's known, and when to be careful ----

export type Evidence = 'some' | 'limited';
export type Herb = { id: string; name: string; use: string; evidence: Evidence; careful: string };

export const HERBS: Herb[] = [
  { id: 'moringa', name: 'Moringa leaves', use: 'Rich in nutrients. Small studies suggest a modest drop in blood sugar after meals.', evidence: 'limited', careful: 'With diabetes medicines it can add to their effect. Check your sugar more often at first.' },
  { id: 'sobolo', name: 'Sobolo (hibiscus), no sugar', use: 'Trials show a small fall in blood pressure. Bought sobolo is often very sweet, so make your own or choose unsweetened.', evidence: 'some', careful: 'Take care with blood pressure medicines (it can add to them) and avoid in pregnancy.' },
  { id: 'ginger', name: 'Ginger', use: 'Can ease nausea and may help blood sugar a little.', evidence: 'limited', careful: 'Large amounts with blood thinners like warfarin can raise bleeding risk.' },
  { id: 'cinnamon', name: 'Cinnamon', use: 'Mixed results for blood sugar. A pinch in koko or oats is fine.', evidence: 'limited', careful: 'Cassia cinnamon in large amounts (more than a teaspoon a day) can harm the liver.' },
  { id: 'bitter_leaf', name: 'Bitter leaf (awonwono)', use: 'A traditional soup green. Early studies only on blood sugar.', evidence: 'limited', careful: 'Eat it as food, not as concentrated drinks or extracts.' },
  { id: 'prekese', name: 'Prekese (Tetrapleura)', use: 'Used in light soup. Lab studies only; no good human trials yet.', evidence: 'limited', careful: 'Fine in soup. Don’t use it as medicine.' },
];

export const AVOID: string[] = [
  'Slimming teas and “detox” drinks. They work as laxatives: you lose water, not fat, and can become dehydrated.',
  'Alcoholic “bitters”. They add calories and alcohol, and can push blood sugar too low.',
  'Neem drinks or any herbal “cure” for diabetes. None replaces medicine.',
  'Never stop or change a prescribed medicine for a herb. Talk to your doctor first.',
];

export const FAST_TIPS: string[] = [
  'Water, unsweetened tea and plain sobolo are fine while fasting.',
  'Break your fast with protein and greens, not a big sweet drink.',
  'Feeling dizzy, shaky or sweaty? Stop the fast and eat.',
  'Fasting is a choice, not a test. Missing a day is fine.',
];
