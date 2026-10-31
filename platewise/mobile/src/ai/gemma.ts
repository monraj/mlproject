import { initLlama, type LlamaContext } from 'llama.rn';
import { fileUri, installedModel } from './modelStore';

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
    const c = await initLlama({
      model: fileUri(model.files.weights.name),
      n_ctx: model.nCtx,
      n_gpu_layers: 0, // Android phones: CPU is the reliable path
      use_mlock: false,
      ctx_shift: false,
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

export type Turn = { role: 'user' | 'assistant'; content: string };

type Args = { system: string; turns: Turn[]; schema: Record<string, unknown>; imageUri?: string; maxTokens?: number };

/** One structured answer from Gemma. Calls run one at a time, since the phone has a single model. */
export function generateJson<T>(a: Args): Promise<T> {
  const run = async (): Promise<T> => {
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
      const res = await c.completion({
        messages: messages as never,
        response_format: { type: 'json_schema', json_schema: { strict: true, schema: a.schema } },
        n_predict: a.maxTokens ?? 900,
        temperature: 0.2,
        top_p: 0.9,
        stop: STOP,
      });
      const t = res.timings;
      const diag = {
        promptTokens: t?.prompt_n,
        outTokens: t?.predicted_n,
        promptPerSec: t?.prompt_per_second?.toFixed(1),
        outPerSec: t?.predicted_per_second?.toFixed(1),
        contextFull: res.context_full,
        hitLimit: res.stopped_limit,
        eos: res.stopped_eos,
      };
      const raw = (res.content || res.text || '').trim();
      try {
        const out = JSON.parse(raw) as T;
        console.log('[gemma] ok', JSON.stringify(diag));
        return out;
      } catch {
        // Some answers wrap the object in extra text; keep just the object.
        const a = raw.indexOf('{');
        const b = raw.lastIndexOf('}');
        if (a >= 0 && b > a) {
          try {
            return JSON.parse(raw.slice(a, b + 1)) as T;
          } catch {
            // fall through to the error below
          }
        }
        console.warn('[gemma] unreadable', JSON.stringify(diag), JSON.stringify(raw.slice(0, 200)), '…', JSON.stringify(raw.slice(-200)));
        throw new SyntaxError(diag.contextFull ? 'context full' : diag.hitLimit ? 'token limit' : 'bad json');
      }
    } catch (e) {
      console.warn('[gemma] failed', e instanceof Error ? e.message : String(e));
      if (e instanceof SyntaxError) throw new GemmaError('Gemma gave an unreadable answer. Try again.');
      throw new GemmaError('Gemma could not finish this answer. Try again.');
    } finally {
      idle = setTimeout(() => void releaseGemma(), IDLE_MS);
    }
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}
