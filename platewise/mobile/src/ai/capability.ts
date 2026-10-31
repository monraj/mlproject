import { GB, MODELS, modelBytes, type GemmaModel } from './models';

/** What the phone can offer, read once in `readDevice()` and passed to `recommend()`. */
export type DeviceInfo = {
  name: string;
  /** Total RAM in bytes, or null when the phone doesn't say. */
  ramBytes: number | null;
  freeBytes: number | null;
  is64Bit: boolean;
  androidApi: number | null;
};

export type Recommendation = {
  model: GemmaModel | null;
  /** Smaller option to offer when the recommended one is big. */
  alternative: GemmaModel | null;
  /** Short plain-language reasons, shown to the person before anything downloads. */
  reasons: string[];
  /** What works offline with the recommended model. */
  offline: string[];
};

// A 4B model at 4-bit needs about 2.5 GB for weights plus ~1.2 GB for the vision file, KV cache and
// the app itself, so ask for real headroom on top of that. Total RAM includes what Android keeps.
const RAM_FOR_4B = 7 * GB;
const RAM_FOR_1B = 3.5 * GB;
const SPARE_STORAGE = 1 * GB;

const gb = (n: number) => `${(n / GB).toFixed(n >= 10 * GB ? 0 : 1)} GB`;

export function recommend(d: DeviceInfo): Recommendation {
  const reasons: string[] = [];
  const m4 = MODELS['gemma-3-4b'];
  const m1 = MODELS['gemma-3-1b'];

  if (!d.is64Bit) {
    return { model: null, alternative: null, reasons: ["This phone's processor isn't 64-bit, so Gemma can't run on it."], offline: [] };
  }
  if (d.androidApi != null && d.androidApi < 29) {
    return { model: null, alternative: null, reasons: ['This version of Android is too old to run Gemma on the phone.'], offline: [] };
  }

  const ram = d.ramBytes;
  const free = d.freeBytes;
  if (ram != null) reasons.push(`Memory: ${gb(ram)}`);
  if (free != null) reasons.push(`Free storage: ${gb(free)}`);

  const fitsStorage = (m: GemmaModel) => free == null || free >= modelBytes(m) + SPARE_STORAGE;

  if (ram != null && ram < RAM_FOR_1B) {
    return { model: null, alternative: null, reasons: [...reasons, 'Not enough memory to run Gemma smoothly. The app will use the server.'], offline: [] };
  }

  if ((ram == null || ram >= RAM_FOR_4B) && fitsStorage(m4)) {
    return {
      model: m4,
      alternative: fitsStorage(m1) ? m1 : null,
      reasons: [...reasons, 'Enough memory and space for the full model, which can read photos.'],
      offline: ['Photo scan', 'Voice and text logging', 'Coach chat', 'Meal ideas', 'Packaged-food labels'],
    };
  }

  if (fitsStorage(m1)) {
    const why = ram != null && ram >= RAM_FOR_4B ? 'Not enough free storage for the full model, so the smaller one is recommended.' : 'The smaller model is the best fit for this phone.';
    return {
      model: m1,
      alternative: null,
      reasons: [...reasons, why],
      offline: ['Voice and text logging', 'Coach chat', 'Meal ideas'],
    };
  }

  return { model: null, alternative: null, reasons: [...reasons, `Free up about ${gb(modelBytes(m1) + SPARE_STORAGE)} of storage to download Gemma.`], offline: [] };
}
