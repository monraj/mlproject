import { initLlama, type LlamaContext } from 'llama.rn';
import * as FileSystem from 'expo-file-system/legacy';
import { fileUri, installedModel, setLastRun } from './modelStore';

// Runs Gemma on the phone. The model is loaded on first use and released after a few idle minutes
// so it doesn't hold ~3 GB of memory while the app sits in the background.

const IDLE_MS = 4 * 60 * 1000;
const STOP = ['<end_of_turn>', '<eos>'];

let ctx: LlamaContext | null = null;
let loadedId: string | null = null;
let loading: Promise<LlamaContext> | null = null;
let idle: ReturnType<typeof setTimeout> | undefined;
let queue: Promise<unknown> = Promise.resolve();

export class GemmaError extends Error {}

/**
 * The phone's faster cores (everything except the slowest cluster). Phones mix big and little cores;
 * with threads left to wander, each token waits for the slowest core. Null if it can't be read.
 */
async function fastCores(): Promise<number[] | null> {
  try {
    const freqs: { cpu: number; khz: number }[] = [];
    for (let cpu = 0; cpu < 16; cpu++) {
      const uri = `file:///sys/devices/system/cpu/cpu${cpu}/cpufreq/cpuinfo_max_freq`;
      if (!(await FileSystem.getInfoAsync(uri)).exists) break;
      freqs.push({ cpu, khz: Number((await FileSystem.readAsStringAsync(uri)).trim()) });
    }
    const slowest = Math.min(...freqs.map((f) => f.khz));
    const fast = freqs.filter((f) => f.khz > slowest).map((f) => f.cpu);
    return fast.length >= 2 ? fast : null;
  } catch {
    return null;
  }
}

export async function releaseGemma(): Promise<void> {
  clearTimeout(idle);
  const c = ctx;
  ctx = null;
  loadedId = null;
  loading = null;
  try {
    await c?.release();
  } catch {
    // already gone
  }
}

async function load(): Promise<LlamaContext> {
  const model = installedModel();
  if (!model) throw new GemmaError('The on-device model is not downloaded yet. Open Me → On-device AI.');
  if (ctx && loadedId === model.id) return ctx;
  if (loading) return loading;
  loading = (async () => {
    await releaseGemma();
    const cores = await fastCores();
    const c = await initLlama({
      model: fileUri(model.files.weights.name),
      n_ctx: model.nCtx,
      n_gpu_layers: 0, // Android phones: CPU is the reliable path
      // Memory-mapped (the default). Copying 3.4 GB into app memory instead pushed the model into
      // swap on a busy phone: a 7-minute load and under 1 token/s (Pixel 9 Pro XL).
      use_mlock: false,
      ctx_shift: false,
      ...(cores ? { n_threads: Math.min(cores.length, 6), cpu_mask: cores.join(','), cpu_strict: true } : { n_threads: 4 }),
    });
    if (model.files.projector) {
      const ok = await c.initMultimodal({ path: fileUri(model.files.projector.name), use_gpu: false });
      if (!ok) throw new GemmaError('The vision part of the model could not start.');
    }
    ctx = c;
    loadedId = model.id;
    return c;
  })();
  try {
    return await loading;
  } catch (e) {
    loading = null;
    throw e instanceof GemmaError ? e : new GemmaError('Gemma could not start on this phone. Try deleting and downloading it again.');
  } finally {
    loading = null;
  }
}

/** Loads the model ahead of time (e.g. when Coach opens) so the first answer doesn't wait for it. */
export function warmGemma(): void {
  if (!installedModel()) return;
  const run = async () => {
    clearTimeout(idle);
    await load();
    idle = setTimeout(() => void releaseGemma(), IDLE_MS);
  };
  queue = queue.then(run, run).catch(() => undefined);
}

export type Turn = { role: 'user' | 'assistant'; content: string };

type Args = { system: string; turns: Turn[]; schema?: Record<string, unknown>; imageUri?: string; maxTokens?: number; onText?: (soFar: string) => void };

function enqueue<T>(run: () => Promise<T>): Promise<T> {
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

/** Runs one completion and returns the raw text. With a schema the output is grammar-constrained. */
async function complete(a: Args): Promise<string> {
  clearTimeout(idle);
  const c = await load();
  if (a.imageUri && !(await c.isMultimodalEnabled())) throw new GemmaError('This model cannot read photos. Use the server, or download the larger model.');
  const messages: unknown[] = [{ role: 'system', content: a.system }];
  a.turns.forEach((t, i) => {
    const last = i === a.turns.length - 1;
    if (last && a.imageUri) {
      messages.push({ role: t.role, content: [{ type: 'text', text: t.content }, { type: 'image_url', image_url: { url: a.imageUri } }] });
    } else {
      messages.push({ role: t.role, content: t.content });
    }
  });
  try {
    const started = Date.now();
    let soFar = '';
    const res = await c.completion({
      messages: messages as never,
      ...(a.schema ? { response_format: { type: 'json_schema' as const, json_schema: { strict: true, schema: a.schema } } } : {}),
      n_predict: a.maxTokens ?? 900,
      temperature: 0.2,
      top_p: 0.9,
      stop: STOP,
    }, a.onText ? (data: { token: string }) => {
      soFar += data.token;
      a.onText?.(soFar);
    } : undefined);
    const t = res.timings;
    if (t) {
      setLastRun({
        seconds: Math.round((Date.now() - started) / 1000),
        promptTokens: t.prompt_n,
        promptPerSec: Math.round(t.prompt_per_second * 10) / 10,
        outTokens: t.predicted_n,
        outPerSec: Math.round(t.predicted_per_second * 10) / 10,
      });
    }
    if (res.context_full) throw new GemmaError('That was too long for the on-device model. Try a shorter question.');
    return (res.content || res.text || '').trim();
  } catch (e) {
    if (e instanceof GemmaError) throw e;
    console.warn('[gemma] failed', e instanceof Error ? e.message : String(e));
    throw new GemmaError('Gemma could not finish this answer. Try again.');
  } finally {
    idle = setTimeout(() => void releaseGemma(), IDLE_MS);
  }
}

/**
 * A plain-text answer. Much faster than JSON: constraining every token to a schema is costly with
 * Gemma's 262k-token vocabulary (measured on a Pixel 9 Pro XL: ~2 tokens/s with the grammar).
 */
export function generateText(a: Omit<Args, 'schema'>): Promise<string> {
  return enqueue(() => complete(a));
}

/** One structured answer from Gemma. Calls run one at a time, since the phone has a single model. */
export function generateJson<T>(a: Args & { schema: Record<string, unknown> }): Promise<T> {
  return enqueue(async () => {
    const raw = await complete(a);
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Some answers wrap the object in extra text; keep just the object.
      const i = raw.indexOf('{');
      const j = raw.lastIndexOf('}');
      if (i >= 0 && j > i) {
        try {
          return JSON.parse(raw.slice(i, j + 1)) as T;
        } catch {
          // fall through
        }
      }
      throw new GemmaError('Gemma gave an unreadable answer. Try again.');
    }
  });
}
