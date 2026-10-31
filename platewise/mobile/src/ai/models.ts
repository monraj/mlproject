export type ModelId = 'gemma-3-4b' | 'gemma-3-1b';

export type ModelFile = { name: string; url: string; bytes: number };

export type GemmaModel = {
  id: ModelId;
  label: string;
  /** Can read photos (needs the vision projector file as well). */
  vision: boolean;
  files: { weights: ModelFile; projector?: ModelFile };
  nCtx: number;
};

const HF = 'https://huggingface.co/ggml-org';

// Public files from ggml-org on Hugging Face (no sign-in needed). Sizes are checked after download.
export const MODELS: Record<ModelId, GemmaModel> = {
  'gemma-3-4b': {
    id: 'gemma-3-4b',
    label: 'Gemma 3 4B',
    vision: true,
    nCtx: 4096,
    files: {
      weights: { name: 'gemma-3-4b-it-Q4_K_M.gguf', url: `${HF}/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it-Q4_K_M.gguf`, bytes: 2489757856 },
      projector: { name: 'gemma-3-4b-mmproj-f16.gguf', url: `${HF}/gemma-3-4b-it-GGUF/resolve/main/mmproj-model-f16.gguf`, bytes: 851251104 },
    },
  },
  'gemma-3-1b': {
    id: 'gemma-3-1b',
    label: 'Gemma 3 1B',
    vision: false,
    nCtx: 4096,
    files: {
      weights: { name: 'gemma-3-1b-it-Q4_K_M.gguf', url: `${HF}/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf`, bytes: 806058240 },
    },
  },
};

export const modelFiles = (m: GemmaModel): ModelFile[] => [m.files.weights, ...(m.files.projector ? [m.files.projector] : [])];
export const modelBytes = (m: GemmaModel): number => modelFiles(m).reduce((s, f) => s + f.bytes, 0);

export const GB = 1024 ** 3;
export const formatGb = (bytes: number): string => `${(bytes / 1e9).toFixed(1)} GB`;
