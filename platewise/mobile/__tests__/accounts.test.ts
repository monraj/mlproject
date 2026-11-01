import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccountError, addAccount, dataKey, getAccounts, keepAccount, loadAccounts, needsPasswordToKeep, passwordProblem, privacyKey, removeAccount, shownAccounts, signInWithPassword, signOut, switchAccount } from '../src/state/accounts';
import { sha256 } from '../src/lib/sha256';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

beforeEach(async () => {
  await AsyncStorage.clear();
  await removeAll();
});

async function removeAll() {
  for (const a of [...getAccounts().list]) await removeAccount(a.id);
}

test('the log already on the phone becomes the first account, signed in', async () => {
  await AsyncStorage.setItem('platewise:v1', JSON.stringify({ profile: { name: 'Ama' }, days: {} }));
  await AsyncStorage.setItem('platewise:privacy', JSON.stringify({ aiConsent: true }));
  await loadAccounts();
  const { list, current } = getAccounts();
  expect(list).toHaveLength(1);
  expect(list[0].name).toBe('Ama');
  expect(current).toBe(list[0].id);
  expect(JSON.parse((await AsyncStorage.getItem(dataKey(list[0].id)))!).profile.name).toBe('Ama');
  expect(JSON.parse((await AsyncStorage.getItem(privacyKey(list[0].id)))!).aiConsent).toBe(true);
  expect(await AsyncStorage.getItem('platewise:v1')).toBeNull();
});

test('each person keeps their own log; signing out keeps it', async () => {
  const ama = await addAccount('Ama');
  await AsyncStorage.setItem(dataKey(ama.id), 'ama-log');
  const kofi = await addAccount('Kofi');
  expect(getAccounts().current).toBe(kofi.id);
  expect(dataKey(kofi.id)).not.toBe(dataKey(ama.id));
  await signOut();
  expect(getAccounts().current).toBeNull();
  expect(getAccounts().list).toHaveLength(2);
  await switchAccount(ama.id);
  expect(getAccounts().current).toBe(ama.id);
  expect(await AsyncStorage.getItem(dataKey(ama.id))).toBe('ama-log');
});

test('the same Google email signs back in to the same person', async () => {
  const a = await addAccount('Ama', { email: 'Ama@Example.com', google: true });
  await signOut();
  const b = await addAccount('Ama A.', { email: 'ama@example.com', google: true });
  expect(b.id).toBe(a.id);
  expect(getAccounts().list).toHaveLength(1);
});

test('removing a person deletes only their log', async () => {
  const ama = await addAccount('Ama');
  const kofi = await addAccount('Kofi');
  await AsyncStorage.setItem(dataKey(ama.id), 'a');
  await AsyncStorage.setItem(dataKey(kofi.id), 'k');
  await removeAccount(kofi.id);
  expect(getAccounts().current).toBeNull();
  expect(await AsyncStorage.getItem(dataKey(kofi.id))).toBeNull();
  expect(await AsyncStorage.getItem(dataKey(ama.id))).toBe('a');
});

describe('removing a person but keeping their log', () => {
  test('Google: hidden from the list, log kept, and back with everything on the next Google sign-in', async () => {
    const ama = await addAccount('Ama', { email: 'ama@gmail.com', google: true });
    await AsyncStorage.setItem(dataKey(ama.id), 'ama-log');
    await keepAccount(ama.id);
    expect(getAccounts().current).toBeNull();
    expect(shownAccounts()).toHaveLength(0);
    expect(await AsyncStorage.getItem(dataKey(ama.id))).toBe('ama-log');
    const back = await addAccount('Ama Mensah', { email: 'AMA@gmail.com', google: true });
    expect(back.id).toBe(ama.id);
    expect(getAccounts().current).toBe(ama.id);
    expect(shownAccounts().map((a) => a.id)).toEqual([ama.id]);
    expect(await AsyncStorage.getItem(dataKey(ama.id))).toBe('ama-log');
  });

  test('no Google: needs a password, then the name and password bring the log back', async () => {
    const kofi = await addAccount('Kofi');
    await AsyncStorage.setItem(dataKey(kofi.id), 'kofi-log');
    expect(needsPasswordToKeep(getAccounts().list[0])).toBe(true);
    await expect(keepAccount(kofi.id)).rejects.toBeInstanceOf(AccountError);
    await keepAccount(kofi.id, 'shito123');
    expect(shownAccounts()).toHaveLength(0);
    const stored = getAccounts().list[0];
    expect(stored.passHash).toBeDefined();
    expect(JSON.stringify(stored)).not.toContain('shito123');
    await expect(signInWithPassword('Kofi', 'wrong')).rejects.toBeInstanceOf(AccountError);
    expect(getAccounts().current).toBeNull();
    const back = await signInWithPassword('  kofi ', 'shito123');
    expect(back.id).toBe(kofi.id);
    expect(getAccounts().current).toBe(kofi.id);
    expect(await AsyncStorage.getItem(dataKey(kofi.id))).toBe('kofi-log');
  });

  test('a new person can choose a password; names with passwords are not shared', async () => {
    const efua = await addAccount('Efua', { password: 'kenkey' });
    await signOut();
    expect((await signInWithPassword('EFUA', 'kenkey')).id).toBe(efua.id);
    expect(passwordProblem('efua', 'banku1')).toMatch(/already has a password/);
    expect(passwordProblem('Esi', 'ab')).toMatch(/at least 4/);
    await expect(addAccount('Efua', { password: 'other1' })).rejects.toBeInstanceOf(AccountError);
  });
});

test('sha256 matches the standard test vectors', () => {
  expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  expect(sha256('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
  expect(sha256('Ɛ́kɔ yie 🍲')).toHaveLength(64);
});
