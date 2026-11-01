import * as LocalAuthentication from 'expo-local-authentication';

// Fingerprint or face unlock, using whatever the phone has set up. The phone's PIN or pattern works
// too, so nobody is locked out of their own log if a finger or face isn't recognised.

export type BiometricKind = 'face' | 'fingerprint' | 'both' | null;

/** What this phone can unlock with, or null when it has no fingerprint or face set up. */
export async function biometricKind(): Promise<BiometricKind> {
  try {
    if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) return null;
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const finger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    return face && finger ? 'both' : face ? 'face' : finger ? 'fingerprint' : null;
  } catch {
    return null;
  }
}

export const kindWords = (k: BiometricKind) => (k === 'both' ? 'fingerprint or face' : k === 'face' ? 'face' : 'fingerprint');

export async function unlock(prompt = 'Unlock PlateWise'): Promise<boolean> {
  try {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, cancelLabel: 'Cancel', disableDeviceFallback: false });
    return r.success;
  } catch {
    return false;
  }
}
