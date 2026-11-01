import { useSyncExternalStore } from 'react';
import * as SecureStore from 'expo-secure-store';

// A person's own AI key (Gemini, ChatGPT or Claude), for those who'd rather use their own plan than
// PlateWise's. Kept in the phone's secure storage, separately for each person, and sent only with AI
// requests. The server uses it for that one request and never keeps or logs it.

export type AiProvider = 'gemini' | 'openai' | 'anthropic';
export const PROVIDERS: { id: AiProvider; name: string; where: string }[] = [
  { id: 'gemini', name: 'Gemini', where: 'aistudio.google.com/api-keys' },
  { id: 'openai', name: 'ChatGPT', where: 'platform.openai.com/api-keys' },
  { id: 'anthropic', name: 'Claude', where: 'console.anthropic.com/settings/keys' },
];
export const providerName = (p: AiProvider) => PROVIDERS.find((o) => o.id === p)?.name ?? p;

export type OwnKey = { provider: AiProvider; key: string; on: boolean };

let storeKey: string | null = null;
let state: OwnKey | null = null;
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((l) => l());

export const getOwnKey = () => state;
export const useOwnKey = (): OwnKey | null => useSyncExternalStore((cb) => (listeners.add(cb), () => listeners.delete(cb)), getOwnKey);

/** The key to send with AI requests right now, or null to use PlateWise's own AI. */
export const activeOwnKey = (): OwnKey | null => (state?.on && state.key ? state : null);

/** Secure-storage names allow only letters, numbers, ".", "-" and "_". */
export const ownKeyName = (accountId: string) => `platewise.aikey.${accountId.replace(/[^\w.-]/g, '_')}`;

/** Loads the signed-in person's key; with nobody signed in, none is used. */
export async function loadOwnKey(accountId: string | null): Promise<void> {
  storeKey = accountId ? ownKeyName(accountId) : null;
  state = null;
  try {
    const raw = storeKey ? await SecureStore.getItemAsync(storeKey) : null;
    if (raw) state = JSON.parse(raw) as OwnKey;
  } catch {
    // no key: PlateWise's AI is used
  }
  tell();
}

export async function saveOwnKey(next: OwnKey | null): Promise<void> {
  state = next;
  tell();
  if (!storeKey) return;
  try {
    if (next) await SecureStore.setItemAsync(storeKey, JSON.stringify(next));
    else await SecureStore.deleteItemAsync(storeKey);
  } catch {
    // still used for this session
  }
}

/** Forgets a person's key, e.g. when they delete their data from this phone. */
export async function forgetOwnKey(accountId: string): Promise<void> {
  await SecureStore.deleteItemAsync(ownKeyName(accountId)).catch(() => undefined);
  if (storeKey === ownKeyName(accountId)) {
    state = null;
    tell();
  }
}

/** "AIza…Qt8Q": enough to recognise a key without showing it. */
export const maskKey = (key: string) => (key.length > 10 ? `${key.slice(0, 4)}…${key.slice(-4)}` : '••••');
