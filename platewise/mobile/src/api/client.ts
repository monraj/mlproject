import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Candidate, DraftItem, FlexPlan, OilLevel, Per100 } from '../state/types';
import { GemmaError } from '../ai/gemma';
import * as onDevice from '../ai/local';
import { getGemmaState, installedModel, isGemmaReady } from '../ai/modelStore';
import { getPrivacy } from './privacy';

const SERVER_KEY = 'platewise:server';
let saved: { url: string; code: string } = { url: '', code: '' };

/** Load the server address and access code the person typed in Me (call once at startup). */
export async function loadServerSettings(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SERVER_KEY);
    if (raw) saved = { url: '', code: '', ...(JSON.parse(raw) as Partial<typeof saved>) };
  } catch {
    // keep defaults
  }
}

export function serverSettings(): { url: string; code: string } {
  return saved;
}

export async function saveServerSettings(url: string, code: string): Promise<void> {
  let u = url.trim().replace(/\/$/, '');
  // No scheme typed: local addresses (this Wi-Fi) use http, anything else https.
  if (u && !/^https?:\/\//.test(u)) u = `${/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u) ? 'http' : 'https'}://${u}`;
  saved = { url: u, code: code.trim() };
  reach = null;
  await AsyncStorage.setItem(SERVER_KEY, JSON.stringify(saved));
}

/**
 * Where the PlateWise server is: the address saved in Me, else EXPO_PUBLIC_API_URL, else (in
 * development) the computer running `expo start`, port 8000.
 */
export function apiBase(): string {
  if (saved.url) return saved.url;
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:8000`;
  return 'http://localhost:8000';
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}, timeoutMs = 90000): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  let res: Response;
  try {
    const headers = new Headers(init.headers);
    if (saved.code) headers.set('X-PlateWise-Code', saved.code);
    res = await fetch(`${apiBase()}${path}`, { ...init, headers, signal: ctl.signal });
  } catch {
    throw new ApiError(
      saved.url
        ? "Can't reach the PlateWise server. Check your internet. A free server can take up to a minute to wake up, so try again."
        : "Can't reach the PlateWise server. Set its address in Me → PlateWise server.",
      0,
    );
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    let msg = 'Something went wrong. Try again.';
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === 'string') msg = body.detail;
    } catch {
      // keep the generic message
    }
    throw new ApiError(msg, res.status);
  }
  return (await res.json()) as T;
}

const json = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

async function imageForm(uri: string, extra: Record<string, string | undefined> = {}): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('image', blob, 'meal.jpg');
  } else {
    // React Native's FormData accepts a { uri, name, type } file descriptor.
    form.append('image', { uri, name: 'meal.jpg', type: 'image/jpeg' } as unknown as Blob);
  }
  for (const [k, v] of Object.entries(extra)) if (v) form.append(k, v);
  return form;
}

// ---- response shapes ----

type ApiItem = {
  id: string;
  name: string;
  food_id: string | null;
  ai_food_id: string | null;
  grams: number;
  grams_low: number;
  grams_high: number;
  ai_grams: number;
  kind: 'grams' | 'count' | 'oil';
  count: number | null;
  count_g: number | null;
  oil: OilLevel;
  oily: boolean;
  greens: boolean;
  confidence: 'low' | 'ok';
  hint: string;
  per100: Per100 | null;
  candidates: { food_id: string; name: string; detail: string }[];
  bbox: number[] | null;
};

export type ScanResult = { isFood: boolean; note: string | null; provider: string; items: DraftItem[] };

type ApiScan = { is_food: boolean; note: string | null; provider: string; items: ApiItem[] };

function toDraft(i: ApiItem): DraftItem {
  const spread = i.grams > 0 ? (i.grams_high - i.grams_low) / (2 * i.grams) : 0.25;
  return {
    id: `${i.id}-${Date.now().toString(36)}`,
    name: i.name,
    hint: i.hint,
    foodId: i.food_id,
    aiFoodId: i.ai_food_id,
    aiGrams: i.ai_grams,
    grams: i.grams,
    gramsLow: i.grams_low,
    gramsHigh: i.grams_high,
    per100: i.per100,
    uncertainty: Math.min(0.5, Math.max(0.08, spread)),
    confidence: i.confidence,
    kind: i.kind,
    count: i.count ?? undefined,
    countG: i.count_g,
    oil: i.oil,
    oily: i.oily,
    greens: i.greens,
    candidates: i.candidates.map((c): Candidate => ({ foodId: c.food_id, name: c.name, detail: c.detail })),
    bbox: i.bbox,
  };
}

function toScan(s: ApiScan): ScanResult {
  return { isFood: s.is_food, note: s.note, provider: s.provider, items: s.items.map(toDraft) };
}

export type Health = { status: string; ai: string; demo: boolean; foods: number };
export type Idea = { id: string; name: string; detail: string; badge: string; category: 'home' | 'chop' | 'quick'; kcal: number; protein: number; items: { food_id: string; name: string; grams: number }[] };
export type ProductInfo = { barcode: string | null; name: string; per100: Per100; serving_g: number | null; serving_label: string; source: string };

// Must match FINAL_MARK in backend/app/api/routes.py.
const FINAL_MARK = '\u001eFINAL\u001e';

/**
 * POST and read a plain-text reply as it arrives (React Native's fetch can't stream on Android;
 * XHR reports progress). Resolves with the server's cleaned final text.
 */
function streamPost(path: string, body: unknown, onText: (soFar: string) => void, timeoutMs = 90000): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${apiBase()}${path}`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (saved.code) xhr.setRequestHeader('X-PlateWise-Code', saved.code);
    xhr.timeout = timeoutMs;
    const shown = () => xhr.responseText.split(FINAL_MARK)[0];
    xhr.onprogress = () => {
      if (xhr.status === 200 && xhr.responseText) onText(shown());
    };
    xhr.onload = () => {
      if (xhr.status !== 200) {
        let msg = 'Something went wrong. Try again.';
        try {
          const detail = (JSON.parse(xhr.responseText) as { detail?: unknown }).detail;
          if (typeof detail === 'string') msg = detail;
        } catch {
          // keep the generic message
        }
        reject(new ApiError(msg, xhr.status));
        return;
      }
      const parts = xhr.responseText.split(FINAL_MARK);
      resolve((parts[1] ?? parts[0]).trim());
    };
    const offline = () =>
      reject(
        new ApiError(
          saved.url
            ? "Can't reach the PlateWise server. Check your internet. A free server can take up to a minute to wake up, so try again."
            : "Can't reach the PlateWise server. Set its address in Me → PlateWise server.",
          0,
        ),
      );
    xhr.onerror = offline;
    xhr.ontimeout = offline;
    xhr.send(JSON.stringify(body));
  });
}

/** Is the server answering right now? Remembered for 20 s so offline use doesn't wait on every request. */
let reach: { at: number; ok: boolean } | null = null;
async function serverReachable(): Promise<boolean> {
  if (reach && Date.now() - reach.at < 20000) return reach.ok;
  let ok = false;
  try {
    await call<Health>('/health', {}, 5000);
    ok = true;
  } catch {
    ok = false;
  }
  reach = { at: Date.now(), ok };
  return ok;
}

async function onDeviceCall<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof GemmaError) throw new ApiError(e.message, 503);
    throw e;
  }
}

/**
 * Online or on the phone. Auto mode uses the server when it answers and Gemma on the phone when it
 * doesn't (no signal, server asleep or down). Without a downloaded model it behaves as before.
 */
/** The server can't be reached and the job would be slow on the phone (reading a photo takes
 * minutes on a phone's CPU): the screen asks before running it on the phone. */
export class SlowOfflineError extends ApiError {}

/** True when photos will be read on the phone (Offline mode, or online AI not allowed). */
export function photosRunOnDevice(): boolean {
  return !getPrivacy().aiConsent || getGemmaState().mode === 'offline';
}

async function route<T>(online: () => Promise<T>, offline: () => Promise<T>, needsVision = false, askBeforeSlow = false): Promise<T> {
  const model = installedModel();
  const canRun = isGemmaReady() && (!needsVision || !!model?.vision);
  // Without consent nothing goes to the server: on-device only.
  const mode = getPrivacy().aiConsent ? getGemmaState().mode : 'offline';
  if (mode === 'offline' && !canRun && !getPrivacy().aiConsent) {
    throw new ApiError('To use AI, allow it in Me → Privacy, or download the on-device model in Me → On-device AI.', 403);
  }
  if (mode === 'offline') {
    if (!isGemmaReady()) throw new ApiError('Offline mode is on, but the on-device model is not downloaded. Open Me → On-device AI.', 503);
    if (!canRun) throw new ApiError('The smaller on-device model cannot read photos. Switch to Auto or Online, or download the larger model.', 503);
    return onDeviceCall(offline);
  }
  if (mode === 'online' || !canRun) return online();
  const slowOffline = () => new SlowOfflineError("Can't reach the PlateWise server right now.", 0);
  if (!(await serverReachable())) {
    if (askBeforeSlow) throw slowOffline();
    return onDeviceCall(offline);
  }
  try {
    return await online();
  } catch (e) {
    if (e instanceof ApiError && (e.status === 0 || e.status >= 500)) {
      reach = null;
      if (askBeforeSlow) throw slowOffline();
      return onDeviceCall(offline);
    }
    throw e;
  }
}

export const api = {
  health: () => call<Health>('/health', {}, 70000),
  /** Checks the access code too (health doesn't need one). */
  check: async () => {
    const h = await call<Health>('/health', {}, 70000);
    await call<unknown>('/foods/search?q=egg', {}, 20000);
    return h;
  },
  /** onDevice: the person chose to read the photo on the phone after the server couldn't be reached. */
  scanPhoto: (uri: string, meal: string, note?: string, opts: { onDevice?: boolean } = {}) =>
    opts.onDevice
      ? onDeviceCall(() => onDevice.scanPhoto(uri, meal, note))
      : route(
          async () => toScan(await call<ApiScan>('/scans', { method: 'POST', body: await imageForm(uri, { meal, note }) })),
          () => onDevice.scanPhoto(uri, meal, note),
          true,
          true,
        ),
  parseText: (text: string, lang: 'en' | 'tw' | 'pcm', meal: string) =>
    route(
      async () => toScan(await call<ApiScan>('/parse', json({ text, lang, meal }))),
      () => onDevice.parseText(text, lang, meal),
    ),
  coach: (messages: { role: 'user' | 'assistant'; content: string }[], context: string, sex: string, hideNumbers: boolean) =>
    route(
      () => call<{ reply: string; flex_plan: FlexPlan | null }>('/coach', json({ messages, context, sex, hide_numbers: hideNumbers })),
      () => onDevice.coach(messages, context, sex, hideNumbers),
    ),
  /** Plain-text coach answer shown as it's written. Not for event plans: use coach() for those. */
  coachStream: (
    messages: { role: 'user' | 'assistant'; content: string }[],
    context: string,
    sex: string,
    hideNumbers: boolean,
    onText: (soFar: string) => void,
  ) =>
    route(
      async () => ({ reply: await streamPost('/coach/stream', { messages, context, sex, hide_numbers: hideNumbers }, onText), flex_plan: null as FlexPlan | null }),
      () => onDevice.coach(messages, context, sex, hideNumbers, onText),
    ),
  ideas: (req: { kcal_left: number; protein_left: number; greens_today: number; meal: string; category: string }) =>
    route(
      () => call<{ ideas: Idea[]; tip: string }>('/ideas', json(req)),
      () => onDevice.ideas(req),
    ),
  /** Barcode lookup needs the internet (Open Food Facts); photograph the label to read it offline. */
  product: (code: string) => call<ProductInfo>(`/products/${encodeURIComponent(code)}`, {}, 15000),
  productLabel: (uri: string) =>
    route(
      async () => call<ProductInfo>('/products/label', { method: 'POST', body: await imageForm(uri) }),
      () => onDevice.productLabel(uri),
      true,
    ),
};
