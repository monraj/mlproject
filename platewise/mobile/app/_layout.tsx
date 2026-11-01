import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { AppStateProvider, useApp } from '../src/state/AppState';
import { syncReminders } from '../src/lib/reminders';
import { planFasting } from '../src/state/fasting';
import { loadServerSettings } from '../src/api/client';
import { loadGemmaState } from '../src/ai/modelStore';
import { WatchSync } from '../src/health/WatchSync';
import { WatchBridge } from '../src/wear/WatchBridge';
import { loadPrivacy } from '../src/api/privacy';
import { loadOwnKey } from '../src/api/ownKey';
import { dataKey, loadAccounts, privacyKey, useAccounts } from '../src/state/accounts';
import { LockScreen } from '../src/components/LockScreen';
import { AppState as RNAppState, View } from 'react-native';
import { SignIn } from '../src/components/SignIn';
import { googleSignOut } from '../src/auth/google';
import { WearSync } from '../modules/wear-sync';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Keeps the phone's scheduled reminders in step with the log. */
function ReminderSync() {
  const { s } = useApp();
  const reminders = s.profile?.reminders;
  const reports = s.profile?.reports !== false;
  const fasting = s.profile?.fasting;
  const diabetes = !!s.profile?.health?.diabetes;
  useEffect(() => {
    if (!s.hydrated || !reminders) return;
    const t = setTimeout(() => syncReminders(reminders, s.days, s.weights, reports, planFasting(fasting, diabetes)), 1500);
    return () => clearTimeout(t);
  }, [s.hydrated, reminders, reports, fasting, diabetes, s.days, s.weights]);
  return null;
}

/** Tapping a notification opens the page it's about (e.g. the evening report). */
function NotificationLinks() {
  const router = useRouter();
  const { s } = useApp();
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const url = last?.notification.request.content.data?.url;
    if (s.hydrated && s.profile && typeof url === 'string' && url.startsWith('/')) router.push(url as never);
  }, [last, s.hydrated, s.profile, router]);
  return null;
}

function Nav() {
  const { c } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="log" options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }} />
      <Stack.Screen name="scan/camera" options={{ animation: 'fade' }} />
      <Stack.Screen name="scan/scanning" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="scan/review" options={{ animation: 'fade' }} />
      <Stack.Screen name="scan/swap" options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }} />
      <Stack.Screen name="scan/saved" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="voice" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="week" options={{ animation: 'fade' }} />
      <Stack.Screen name="checkin" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="type" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="barcode" options={{ animation: 'fade' }} />
      <Stack.Screen name="saved-meals" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="vitals" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="report" options={{ animation: 'fade' }} />
      <Stack.Screen name="plan" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="weigh" options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }} />
    </Stack>
  );
}

/**
 * The signed-in person's app, or the sign-in screen. Switching people remounts everything under the
 * new person's saved log; signing out clears the watch, the widget and the reminders so the next
 * person doesn't see them.
 */
// Back after this long away and a locked account asks for the fingerprint or face again.
const RELOCK_MS = 60 * 1000;

/** Locked until the person unlocks; locks again after a minute in the background. */
function useLock(locked: boolean, current: string | null) {
  const [open, setOpen] = React.useState(false);
  const away = React.useRef<number | null>(null);
  useEffect(() => setOpen(false), [current]);
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (st) => {
      if (st === 'background') away.current = Date.now();
      else if (st === 'active' && away.current != null) {
        if (Date.now() - away.current >= RELOCK_MS) setOpen(false);
        away.current = null;
      }
    });
    return () => sub.remove();
  }, []);
  return { showLock: locked && !open, unlocked: () => setOpen(true) };
}

function Accounts() {
  const { current, list } = useAccounts();
  const account = list.find((a) => a.id === current) ?? null;
  const { showLock, unlocked } = useLock(!!account?.lock, current);
  const [ready, setReady] = React.useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setReady(null);
    Promise.all([loadPrivacy(current ? privacyKey(current) : null), loadOwnKey(current)]).finally(() => live && setReady(current ?? ''));
    if (!current) {
      Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
      WearSync?.sendToday('{}').catch(() => undefined);
      WearSync?.updateWidget?.('{}').catch(() => undefined);
      void googleSignOut();
    }
    return () => {
      live = false;
    };
  }, [current]);
  if (ready !== (current ?? '')) return null;
  if (!current || !account) return <SignIn />;
  return (
    <View style={{ flex: 1 }}>
      <AppStateProvider key={current} storageKey={dataKey(current)}>
        <ReminderSync />
        <NotificationLinks />
        <WatchSync />
        <WatchBridge />
        <Nav />
      </AppStateProvider>
      {showLock ? <LockScreen key={current} account={account} onUnlock={unlocked} /> : null}
    </View>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const [serverReady, setServerReady] = React.useState(false);
  useEffect(() => {
    loadGemmaState().catch(() => undefined);
    Promise.all([loadServerSettings(), loadAccounts()]).finally(() => setServerReady(true));
  }, []);

  useEffect(() => {
    if (loaded && serverReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded, serverReady]);

  if (!loaded || !serverReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Accounts />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
