import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { passwordHash } from '../lib/sha256';

// The people who use PlateWise on this phone. Each has their own log, saved under their own key, so
// signing out and in as someone else never mixes two people's meals. Nothing here leaves the phone.

const KEY = 'platewise:accounts';
const LEGACY_DATA = 'platewise:v1';
const LEGACY_PRIVACY = 'platewise:privacy';

export type Account = {
  id: string;
  name: string;
  email?: string;
  google?: boolean;
  created: string;
  /** Ask for fingerprint or face before showing this person's log. */
  lock?: boolean;
  /** Removed from the list but their log kept on the phone, until they sign in again. */
  hidden?: boolean;
  /** For signing in without Google: the name in lower case, and a salted hash of the password. */
  username?: string;
  salt?: string;
  passHash?: string;
};
export type Accounts = { list: Account[]; current: string | null };

/** Something the person can fix, in their words (e.g. a wrong password). */
export class AccountError extends Error {}

/** The people shown on the sign-in list: everyone except those kept away until they sign in. */
export const shownAccounts = (s: Accounts = state) => s.list.filter((a) => !a.hidden);

const PASSWORD_MIN = 4;
const usernameOf = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');
/** Why this password can't be used for this name, in the person's words, or null when it's fine. */
export function passwordProblem(name: string, password: string, id?: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} letters or numbers for the password.`;
  if (state.list.some((o) => o.id !== id && o.passHash && o.username === usernameOf(name))) return `Someone called ${name.trim()} already has a password on this phone. Use a different name.`;
  return null;
}

const withPassword = (a: Account, password: string): Account => {
  const problem = passwordProblem(a.name, password, a.id);
  if (problem) throw new AccountError(problem);
  const username = usernameOf(a.name);
  const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
  return { ...a, username, salt, passHash: passwordHash(password, salt) };
};

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
      const saved: Accounts = { list: [], current: null, ...(JSON.parse(raw) as Partial<Accounts>) };
      // From when several people could sit on the sign-in list: everyone not signed in now, who
      // can sign back in, signs in again instead of being one tap away.
      state = { ...saved, list: saved.list.map((a) => (a.id !== saved.current && !needsPasswordToKeep(a) ? { ...a, hidden: true } : a)) };
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

const comeBack = async (a: Account): Promise<Account> => {
  const back = { ...a, hidden: false };
  await save({ list: state.list.map((o) => (o.id === a.id ? back : o)), current: a.id });
  return back;
};

/**
 * Adds a person and signs them in. With Google, someone already on this phone (even one who was
 * removed but kept their log) is found again by email and carries on where they left off. Without
 * Google, a password lets them sign back in later.
 */
export async function addAccount(name: string, extra: { email?: string; google?: boolean; password?: string } = {}): Promise<Account> {
  const email = extra.email?.trim().toLowerCase();
  const found = email ? state.list.find((a) => a.email === email) : undefined;
  if (found) return comeBack(found);
  let account: Account = { id: newAccountId(), name: name.trim() || 'Me', created: new Date().toISOString(), ...(email ? { email } : {}), ...(extra.google ? { google: true } : {}) };
  if (extra.password != null) account = withPassword(account, extra.password);
  await save({ list: [...state.list, account], current: account.id });
  return account;
}

/** Signs in with a name and password, bringing back that person's log if it was kept. */
export async function signInWithPassword(name: string, password: string): Promise<Account> {
  const a = state.list.find((o) => o.passHash && o.username === usernameOf(name));
  if (!a || passwordHash(password, a.salt ?? '') !== a.passHash) throw new AccountError('That name and password don’t match anyone on this phone.');
  return comeBack(a);
}

/** True when keeping this person's log needs a password first (no Google, no password yet). */
export const needsPasswordToKeep = (a: Account) => !a.google && !a.passHash;

/**
 * Takes a person off the list and signs them out, but keeps their log on the phone. Signing in
 * again (Google, or name and password) brings it all back.
 */
export async function keepAccount(id: string, password?: string): Promise<void> {
  const a = state.list.find((o) => o.id === id);
  if (!a) return;
  if (needsPasswordToKeep(a) && password == null) throw new AccountError('Choose a password so you can sign back in.');
  const kept = { ...(password != null && !a.google ? withPassword(a, password) : a), hidden: true };
  await save({ list: state.list.map((o) => (o.id === id ? kept : o)), current: state.current === id ? null : state.current });
}

export const switchAccount = (id: string) => save({ ...state, current: state.list.some((a) => a.id === id) ? id : state.current });

/**
 * One person is signed in at a time. Signing out keeps their log on the phone but takes them off the
 * sign-in screen, so the next person can't just tap their name: they sign back in with Google or
 * their password. Someone with neither stays on the list, so they're never locked out.
 */
export const signOut = () =>
  save({ list: state.list.map((a) => (a.id === state.current && !needsPasswordToKeep(a) ? { ...a, hidden: true } : a)), current: null });

export async function renameAccount(id: string, name: string): Promise<void> {
  if (!name.trim()) return;
  // The sign-in name follows the person's name, unless someone else already signs in with it.
  const free = !state.list.some((o) => o.id !== id && o.passHash && o.username === usernameOf(name));
  await save({ ...state, list: state.list.map((a) => (a.id === id ? { ...a, name: name.trim(), ...(a.passHash && free ? { username: usernameOf(name) } : {}) } : a)) });
}

export async function setLock(id: string, lock: boolean): Promise<void> {
  await save({ ...state, list: state.list.map((a) => (a.id === id ? { ...a, lock } : a)) });
}

/** Removes a person and everything they logged from this phone. */
export async function removeAccount(id: string): Promise<void> {
  await AsyncStorage.multiRemove([dataKey(id), privacyKey(id)]).catch(() => undefined);
  await save({ list: state.list.filter((a) => a.id !== id), current: state.current === id ? null : state.current });
}
