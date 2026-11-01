import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Consent for sending meal photos and descriptions to the server and its AI provider (Google Gemini).
// Without it the app only uses on-device AI. Kept apart from the profile so the API layer can read it.
// Each person on the phone gives (or doesn't give) their own consent.

let key: string | null = null;

export type Privacy = { aiConsent: boolean; at: string | null };

let state: Privacy = { aiConsent: false, at: null };
const listeners = new Set<() => void>();

export const getPrivacy = () => state;
export const usePrivacy = (): Privacy => useSyncExternalStore((cb) => (listeners.add(cb), () => listeners.delete(cb)), getPrivacy);

/** Loads the signed-in person's choice; with nobody signed in, nothing is sent. */
export async function loadPrivacy(storageKey: string | null): Promise<void> {
  key = storageKey;
  state = { aiConsent: false, at: null };
  try {
    const raw = storageKey ? await AsyncStorage.getItem(storageKey) : null;
    if (raw) state = { ...state, ...(JSON.parse(raw) as Partial<Privacy>) };
  } catch {
    // keep defaults: no consent
  }
  listeners.forEach((l) => l());
}

export async function setAiConsent(on: boolean): Promise<void> {
  state = { aiConsent: on, at: on ? new Date().toISOString() : null };
  listeners.forEach((l) => l());
  try {
    if (key) await AsyncStorage.setItem(key, JSON.stringify(state));
  } catch {
    // the choice still applies for this session
  }
}

export const AI_CONSENT_TEXT =
  'Send my meal photos, voice and typed descriptions, and coach chats to the PlateWise server so Google’s Gemini AI can identify foods and answer. Photos are not stored.';
