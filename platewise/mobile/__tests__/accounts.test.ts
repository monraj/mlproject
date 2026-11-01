import AsyncStorage from '@react-native-async-storage/async-storage';
import { addAccount, dataKey, getAccounts, loadAccounts, privacyKey, removeAccount, signOut, switchAccount } from '../src/state/accounts';

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
