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
// QAT (quantization-aware trained) Q4_0 builds: close to full-precision quality, and Q4_0 uses
// llama.cpp's fastest ARM kernels (dotprod / i8mm), so phones read prompts much faster.
export const MODELS: Record<ModelId, GemmaModel> = {
  'gemma-3-4b': {
    id: 'gemma-3-4b',
    label: 'Gemma 3 4B',
    vision: true,
    nCtx: 4096,
    files: {
      weights: { name: 'gemma-3-4b-it-qat-Q4_0.gguf', url: `${HF}/gemma-3-4b-it-qat-GGUF/resolve/main/gemma-3-4b-it-qat-Q4_0.gguf`, bytes: 2526080992 },
      projector: { name: 'gemma-3-4b-qat-mmproj-f16.gguf', url: `${HF}/gemma-3-4b-it-qat-GGUF/resolve/main/mmproj-model-f16-4B.gguf`, bytes: 851251744 },
    },
  },
  'gemma-3-1b': {
    id: 'gemma-3-1b',
    label: 'Gemma 3 1B',
    vision: false,
    nCtx: 4096,
    files: {
      weights: { name: 'gemma-3-1b-it-qat-Q4_0.gguf', url: `${HF}/gemma-3-1b-it-qat-GGUF/resolve/main/gemma-3-1b-it-qat-Q4_0.gguf`, bytes: 720425600 },
    },
  },
};

export const modelFiles = (m: GemmaModel): ModelFile[] => [m.files.weights, ...(m.files.projector ? [m.files.projector] : [])];
export const modelBytes = (m: GemmaModel): number => modelFiles(m).reduce((s, f) => s + f.bytes, 0);

export const GB = 1024 ** 3;
export const formatGb = (bytes: number): string => `${(bytes / 1e9).toFixed(1)} GB`;
