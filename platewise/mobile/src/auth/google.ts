import { Platform } from 'react-native';
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';

// "Continue with Google": Google tells us who the person is (name and Gmail address) so the same
// person always opens the same log, even after signing out. Only the name and email are read; the
// log itself stays on the phone.

// Google Cloud's Web client ID. Not a secret; set it in mobile/.env as EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let configured = false;
function configure() {
  if (configured) return;
  GoogleSignin.configure({ ...(WEB_CLIENT_ID ? { webClientId: WEB_CLIENT_ID } : {}), scopes: ['email', 'profile'] });
  configured = true;
}

export const googleAvailable = Platform.OS === 'android';

export type GoogleResult = { ok: true; name: string; email: string } | { ok: false; cancelled: boolean; message: string };

export async function signInWithGoogle(): Promise<GoogleResult> {
  try {
    configure();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Always show the account chooser, so a second person on the phone can pick their own Gmail.
    await GoogleSignin.signOut().catch(() => undefined);
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) return { ok: false, cancelled: true, message: '' };
    const u = res.data.user;
    return { ok: true, name: u.givenName || u.name || u.email.split('@')[0], email: u.email };
  } catch (e) {
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) return { ok: false, cancelled: true, message: '' };
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return { ok: false, cancelled: false, message: 'Google Play services are needed for Google sign-in.' };
      if (e.code === statusCodes.IN_PROGRESS) return { ok: false, cancelled: true, message: '' };
      // DEVELOPER_ERROR (code 10): this app's Android client isn't registered in Google Cloud yet.
      if (String(e.code) === '10' || /DEVELOPER_ERROR/.test(e.message)) {
        return { ok: false, cancelled: false, message: 'Google sign-in isn’t set up for this app yet. Add a name below for now.' };
      }
    }
    return { ok: false, cancelled: false, message: 'Couldn’t reach Google. Check your connection and try again.' };
  }
}

/** Forget the Google session on this phone (PlateWise keeps the person's log). */
export async function googleSignOut(): Promise<void> {
  if (!googleAvailable) return;
  try {
    configure();
    await GoogleSignin.signOut();
  } catch {
    // not signed in with Google
  }
}
