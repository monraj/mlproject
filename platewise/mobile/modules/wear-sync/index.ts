import { Platform } from 'react-native';
import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

type WearSyncModule = {
  sendToday(json: string): Promise<boolean>;
  hasWatch(): Promise<boolean>;
  watchWater(date: string): Promise<number>;
  addListener(event: 'onWatchData', fn: (e: { path: string }) => void): EventSubscription;
};

/** Null on iOS / web, or if the native module isn't in this build. */
export const WearSync: WearSyncModule | null = Platform.OS === 'android' ? requireOptionalNativeModule<WearSyncModule>('WearSync') : null;
