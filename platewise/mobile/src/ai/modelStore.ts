import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { MODELS, modelBytes, modelFiles, type GemmaModel, type ModelId } from './models';

const KEY = 'platewise:gemma';

export type AiMode = 'auto' | 'online' | 'offline';

export type GemmaState = {
  loaded: boolean;
  /** The model that is fully downloaded, if any. */
  installed: ModelId | null;
  mode: AiMode;
  download: { model: ModelId; done: number; total: number } | null;
  error: string | null;
  /** How the last on-device answer's time was spent; shown in Me so slowness can be diagnosed. */
  lastRun: { seconds: number; promptTokens: number; promptPerSec: number; outTokens: number; outPerSec: number } | null;
};

let state: GemmaState = { loaded: false, installed: null, mode: 'auto', download: null, error: null, lastRun: null };
const listeners = new Set<() => void>();
let current: FileSystem.DownloadResumable | null = null;
let currentKey = '';
let cancelled = false;

function set(patch: Partial<GemmaState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const getGemmaState = () => state;
export const setLastRun = (lastRun: GemmaState['lastRun']) => set({ lastRun });
export const useGemma = (): GemmaState => useSyncExternalStore((cb) => (listeners.add(cb), () => listeners.delete(cb)), getGemmaState);

const dir = () => `${FileSystem.documentDirectory}gemma/`;
export const fileUri = (name: string) => `${dir()}${name}`;

async function persist() {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ installed: state.installed, mode: state.mode }));
  } catch {
    // settings just won't survive a restart
  }
}

async function intact(model: GemmaModel): Promise<boolean> {
  for (const f of modelFiles(model)) {
    const info = await FileSystem.getInfoAsync(fileUri(f.name));
    if (!info.exists || info.size !== f.bytes) return false;
  }
  return true;
}

/** Deletes model files the app no longer uses (e.g. after a model update), so they don't eat storage. */
async function removeStaleFiles(): Promise<void> {
  try {
    const keep = new Set(Object.values(MODELS).flatMap((m) => modelFiles(m).flatMap((f) => [f.name, `${f.name}.part`])));
    const info = await FileSystem.getInfoAsync(dir());
    if (!info.exists) return;
    for (const name of await FileSystem.readDirectoryAsync(dir())) {
      if (!keep.has(name)) await FileSystem.deleteAsync(fileUri(name), { idempotent: true });
    }
  } catch {
    // best effort
  }
}

/** Call once at startup: restores the mode and checks that the downloaded files are still there. */
export async function loadGemmaState(): Promise<void> {
  await removeStaleFiles();
  let saved: { installed?: ModelId | null; mode?: AiMode } = {};
  try {
    saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}');
  } catch {
    // defaults
  }
  const installed = saved.installed && MODELS[saved.installed] && (await intact(MODELS[saved.installed])) ? saved.installed : null;
  set({ loaded: true, installed, mode: saved.mode ?? 'auto' });
}

export async function setAiMode(mode: AiMode): Promise<void> {
  set({ mode });
  await persist();
}

export function isGemmaReady(): boolean {
  return state.installed != null;
}

export function installedModel(): GemmaModel | null {
  return state.installed ? MODELS[state.installed] : null;
}

/** Downloads every file of the model, one after another, with overall progress. Safe to call again to resume. */
export async function downloadModel(id: ModelId): Promise<void> {
  if (state.download) return;
  const model = MODELS[id];
  const total = modelBytes(model);
  cancelled = false;
  set({ error: null, download: { model: id, done: 0, total } });
  try {
    await FileSystem.makeDirectoryAsync(dir(), { intermediates: true });
    let before = 0;
    for (const f of modelFiles(model)) {
      const dest = fileUri(f.name);
      const have = await FileSystem.getInfoAsync(dest);
      if (have.exists && have.size === f.bytes) {
        before += f.bytes;
        set({ download: { model: id, done: before, total } });
        continue;
      }
      const part = `${dest}.part`;
      const resumeKey = `${KEY}:resume:${f.name}`;
      currentKey = resumeKey;
      let resumeData: string | undefined;
      try {
        resumeData = (await AsyncStorage.getItem(resumeKey)) ?? undefined;
      } catch {
        resumeData = undefined;
      }
      const onProgress = (p: { totalBytesWritten: number }) => set({ download: { model: id, done: before + p.totalBytesWritten, total } });
      current = FileSystem.createDownloadResumable(f.url, part, {}, onProgress, resumeData);
      let saveTimer = 0;
      const timer = setInterval(() => {
        saveTimer++;
        if (current && saveTimer % 5 === 0) AsyncStorage.setItem(resumeKey, JSON.stringify(current.savable())).catch(() => undefined);
      }, 1000);
      let res: FileSystem.FileSystemDownloadResult | undefined;
      try {
        res = resumeData ? await current.resumeAsync() : await current.downloadAsync();
      } finally {
        clearInterval(timer);
      }
      if (cancelled) throw new Error('cancelled');
      if (!res || res.status < 200 || res.status >= 300) throw new Error(`The download failed (error ${res?.status ?? 'unknown'}). Check your internet and try again.`);
      const info = await FileSystem.getInfoAsync(part);
      if (!info.exists || info.size !== f.bytes) {
        await FileSystem.deleteAsync(part, { idempotent: true });
        await AsyncStorage.removeItem(resumeKey).catch(() => undefined);
        throw new Error('The downloaded file was incomplete. Please try again.');
      }
      await FileSystem.moveAsync({ from: part, to: dest });
      await AsyncStorage.removeItem(resumeKey).catch(() => undefined);
      before += f.bytes;
    }
    set({ installed: id, download: null });
    await persist();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'The download failed.';
    set({ download: null, error: msg === 'cancelled' ? null : /network|offline|connect/i.test(msg) ? 'No internet connection. Connect to Wi-Fi and try again; the download picks up where it stopped.' : msg });
  } finally {
    current = null;
  }
}

/** Stops the download. The partly downloaded file is kept so the next try resumes. */
export async function cancelDownload(): Promise<void> {
  cancelled = true;
  try {
    await current?.pauseAsync();
    if (current && currentKey) await AsyncStorage.setItem(currentKey, JSON.stringify(current.savable()));
  } catch {
    // nothing to pause
  }
  set({ download: null });
}

export async function deleteModel(): Promise<void> {
  const { releaseGemma } = await import('./gemma');
  await releaseGemma();
  await FileSystem.deleteAsync(dir(), { idempotent: true });
  set({ installed: null });
  await persist();
}
