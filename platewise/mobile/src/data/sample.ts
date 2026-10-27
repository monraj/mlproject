// SAMPLE DATA FOR THE UI PROTOTYPE ONLY.
// Every calorie and gram figure here is illustrative so the screens have something to show.
// Real values come from the backend food database (USDA + FAO West Africa + reviewed
// Ghanaian recipes) once Phases 1–3 of ROADMAP.md are built. Do not reuse these numbers.

export type Candidate = {
  name: string;
  detail: string;
  kcalPerGram: number;
};

export type DraftItem = {
  id: string;
  name: string;
  hint?: string;
  grams: number;
  gramsLow: number;
  gramsHigh: number;
  kcalPerGram: number;
  uncertainty: number; // ± share used to show a range, e.g. 0.2 = ±20%
  confidence: 'low' | 'ok';
  kind: 'grams' | 'count' | 'oil';
  count?: number;
  kcalPerCount?: number;
  oil?: 'light' | 'normal' | 'very';
  candidates?: Candidate[];
};

export type Meal = {
  id: string;
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  time: string;
  title: string;
  kcal: number;
  protein: number;
  swatch: string;
};

export type Tip = { kind: 'good' | 'tip' | 'info'; title: string; body: string };

export type Idea = {
  id: string;
  name: string;
  detail: string;
  kcal: number;
  protein: number;
  badge: string;
  category: 'home' | 'chop' | 'quick';
};

export const sampleScan: DraftItem[] = [
  {
    id: 'rice',
    name: 'Rice and beans',
    hint: 'Is this waakye? Tap to check',
    grams: 320,
    gramsLow: 240,
    gramsHigh: 420,
    kcalPerGram: 1.5,
    uncertainty: 0.22,
    confidence: 'low',
    kind: 'grams',
    candidates: [
      { name: 'Waakye', detail: 'Rice and beans cooked with sorghum leaves', kcalPerGram: 1.5 },
      { name: 'Rice and beans, plain', detail: 'Cooked together, no leaves', kcalPerGram: 1.45 },
      { name: 'Jollof rice', detail: 'Rice cooked in tomato stew', kcalPerGram: 1.6 },
    ],
  },
  {
    id: 'stew',
    name: 'Pepper stew',
    hint: 'How oily was it?',
    grams: 40,
    gramsLow: 25,
    gramsHigh: 70,
    kcalPerGram: 3.4,
    uncertainty: 0.3,
    confidence: 'ok',
    kind: 'oil',
    oil: 'normal',
  },
  {
    id: 'egg',
    name: 'Boiled egg',
    hint: 'Looks right',
    grams: 50,
    gramsLow: 45,
    gramsHigh: 60,
    kcalPerGram: 1.5,
    uncertainty: 0.08,
    confidence: 'ok',
    kind: 'count',
    count: 1,
    kcalPerCount: 75,
  },
  {
    id: 'plantain',
    name: 'Fried plantain',
    hint: 'Looks right',
    grams: 80,
    gramsLow: 55,
    gramsHigh: 120,
    kcalPerGram: 2.6,
    uncertainty: 0.22,
    confidence: 'ok',
    kind: 'grams',
  },
];

export const sampleVoiceScan: DraftItem[] = [
  {
    id: 'kenkey',
    name: 'Kenkey',
    hint: '2 balls, from what you said',
    grams: 360,
    gramsLow: 300,
    gramsHigh: 420,
    kcalPerGram: 1.0,
    uncertainty: 0.18,
    confidence: 'ok',
    kind: 'grams',
  },
  {
    id: 'fish',
    name: 'Fried fish',
    hint: '1 piece',
    grams: 110,
    gramsLow: 80,
    gramsHigh: 150,
    kcalPerGram: 2.2,
    uncertainty: 0.25,
    confidence: 'ok',
    kind: 'grams',
  },
  {
    id: 'pepper',
    name: 'Pepper (shito)',
    hint: 'How much? Tap to set',
    grams: 20,
    gramsLow: 5,
    gramsHigh: 40,
    kcalPerGram: 3.0,
    uncertainty: 0.4,
    confidence: 'low',
    kind: 'grams',
    candidates: [
      { name: 'Shito (black pepper sauce)', detail: 'Oil-based, rich', kcalPerGram: 3.0 },
      { name: 'Fresh pepper (ground)', detail: 'Tomato, onion, pepper', kcalPerGram: 0.4 },
    ],
  },
];

export const startMeals: Meal[] = [
  { id: 'm1', type: 'Breakfast', time: '7:40 am', title: 'Hausa koko and koose', kcal: 230, protein: 9, swatch: '#EADBC4' },
  { id: 'm2', type: 'Lunch', time: '1:15 pm', title: 'Waakye, egg, stew, plantain', kcal: 900, protein: 43, swatch: '#6E3A2A' },
];

export const mealTips: Tip[] = [
  { kind: 'good', title: 'Good protein', body: "The egg and beans helped. You're about halfway to today's protein goal." },
  { kind: 'tip', title: 'Oil adds up', body: 'We counted extra oil for the stew. Asking for less on top saves the most.' },
  { kind: 'info', title: 'Low on greens', body: 'Add kontomire, garden eggs or a salad at dinner for fibre.' },
];

export const dinnerIdeas: Idea[] = [
  { id: 'i1', name: 'Light soup with tilapia', detail: 'With a small ball of fufu', kcal: 600, protein: 38, badge: 'Best fit', category: 'chop' },
  { id: 'i2', name: 'Kontomire stew with yam', detail: 'Adds the greens lunch was missing', kcal: 550, protein: 22, badge: 'Most fibre', category: 'home' },
  { id: 'i3', name: 'Grilled chicken', detail: 'With a half portion of kelewele', kcal: 650, protein: 45, badge: 'Most protein', category: 'quick' },
];

// Weight series for the Progress chart: 13 weigh-ins over 6 weeks (kg).
export const weighIns: number[] = [84.4, 84.1, 83.8, 83.95, 83.55, 83.75, 83.2, 83.4, 83.05, 82.95, 82.7, 82.8, 82.5];
export const trend: number[] = [84.2, 83.95, 83.8, 83.6, 83.45, 83.3, 83.15, 83.0, 82.85, 82.7, 82.55, 82.4, 82.1];
export const forecastMid: number[] = [82.1, 81.1, 80.2, 79.4];
export const forecastLow: number[] = [82.1, 80.7, 79.6, 77.9];
export const forecastHigh: number[] = [82.1, 81.5, 80.8, 80.0];

export const weekDays = [
  { d: 'M', kcal: 1780 },
  { d: 'T', kcal: 2050 },
  { d: 'W', kcal: 1700 },
  { d: 'T', kcal: 1840 },
  { d: 'F', kcal: 2200 },
  { d: 'S', kcal: 1950 },
  { d: 'S', kcal: 1600 },
];

export type ChatMsg = { id: string; from: 'me' | 'coach'; text: string; plan?: boolean };

export const coachOpening: ChatMsg[] = [
  { id: 'c1', from: 'me', text: 'I have a wedding on Saturday. How do I stay on track without missing the fun?' },
  {
    id: 'c2',
    from: 'coach',
    text: "Enjoy it! Two things help most: don't skip meals before, and flex a little on Thursday and Friday so Saturday has room.",
    plan: true,
  },
];

export const coachReplies: string[] = [
  'At a buffet, start with the grilled protein and salad, then add one starch you really love. A small plate helps.',
  "Slow weeks are normal. Your weigh-ins jump with water and salt. Look at the trend line, not one day's number.",
  "Good question. I'll keep it simple: aim for protein at every meal and greens once a day. You're doing well.",
];
