import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
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

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Keeps the phone's scheduled reminders in step with the log. */
function ReminderSync() {
  const { s } = useApp();
  const reminders = s.profile?.reminders;
  useEffect(() => {
    if (!s.hydrated || !reminders) return;
    const t = setTimeout(() => syncReminders(reminders, s.days, s.weights), 1500);
    return () => clearTimeout(t);
  }, [s.hydrated, reminders, s.days, s.weights]);
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
      <Stack.Screen name="weigh" options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }} />
    </Stack>
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

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppStateProvider>
            <ReminderSync />
            <Nav />
          </AppStateProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
