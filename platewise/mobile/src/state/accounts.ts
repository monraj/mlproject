import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// The people who use PlateWise on this phone. Each has their own log, saved under their own key, so
// signing out and in as someone else never mixes two people's meals. Nothing here leaves the phone.

const KEY = 'platewise:accounts';
const LEGACY_DATA = 'platewise:v1';
const LEGACY_PRIVACY = 'platewise:privacy';

export type Account = { id: string; name: string; email?: string; google?: boolean; created: string; /** Ask for fingerprint or face before showing this person's log. */ lock?: boolean };
export type Accounts = { list: Account[]; current: string | null };

let state: Accounts = { list: [], current: null };
const listeners = new Set<() => void>();

export const getAccounts = () => state;
export const useAccounts = (): Accounts => useSyncExternalStore((cb) => (listeners.add(cb), () => listeners.delete(cb)), getAccounts);
export const currentAccount = (): Account | null => state.list.find((a) => a.id === state.current) ?? null;

/** Where one person's log and AI consent are kept. */
export const dataKey = (id: string) => `${LEGACY_DATA}:${id}`;
export const privacyKey = (id: string) => `${LEGACY_PRIVACY}:${id}`;

const newAccountId = () => `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function save(next: Accounts): Promise<void> {
  state = next;
  listeners.forEach((l) => l());
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
}

/**
 * Loads the accounts. On the first run after this update, the log already on the phone becomes the
 * first account (signed in), so nobody loses their history.
 */
export async function loadAccounts(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      state = { list: [], current: null, ...(JSON.parse(raw) as Partial<Accounts>) };
    } else {
      const legacy = await AsyncStorage.getItem(LEGACY_DATA);
      if (legacy) {
        const name = (JSON.parse(legacy) as { profile?: { name?: string } | null }).profile?.name?.trim() || 'Me';
        const first: Account = { id: newAccountId(), name, created: new Date().toISOString() };
        await AsyncStorage.setItem(dataKey(first.id), legacy);
        const privacy = await AsyncStorage.getItem(LEGACY_PRIVACY);
        if (privacy) await AsyncStorage.setItem(privacyKey(first.id), privacy);
        await save({ list: [first], current: first.id });
        await AsyncStorage.multiRemove([LEGACY_DATA, LEGACY_PRIVACY]);
        return;
      }
    }
  } catch {
    // start with no accounts: the sign-in screen shows
  }
  listeners.forEach((l) => l());
}

/** Adds a person (or finds them again by email, for Google) and signs them in. */
export async function addAccount(name: string, extra: { email?: string; google?: boolean } = {}): Promise<Account> {
  const email = extra.email?.trim().toLowerCase();
  const found = email ? state.list.find((a) => a.email === email) : undefined;
  if (found) {
    await save({ ...state, current: found.id });
    return found;
  }
  const account: Account = { id: newAccountId(), name: name.trim() || 'Me', created: new Date().toISOString(), ...(email ? { email } : {}), ...(extra.google ? { google: true } : {}) };
  await save({ list: [...state.list, account], current: account.id });
  return account;
}

export const switchAccount = (id: string) => save({ ...state, current: state.list.some((a) => a.id === id) ? id : state.current });

export const signOut = () => save({ ...state, current: null });

export async function renameAccount(id: string, name: string): Promise<void> {
  if (!name.trim()) return;
  await save({ ...state, list: state.list.map((a) => (a.id === id ? { ...a, name: name.trim() } : a)) });
}

export async function setLock(id: string, lock: boolean): Promise<void> {
  await save({ ...state, list: state.list.map((a) => (a.id === id ? { ...a, lock } : a)) });
}

/** Removes a person and everything they logged from this phone. */
export async function removeAccount(id: string): Promise<void> {
  await AsyncStorage.multiRemove([dataKey(id), privacyKey(id)]).catch(() => undefined);
  await save({ list: state.list.filter((a) => a.id !== id), current: state.current === id ? null : state.current });
}
