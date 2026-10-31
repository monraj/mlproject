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
      return JSON.parse(res.text) as T;
    } catch (e) {
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
