import { Platform } from 'react-native';
import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

type WearSyncModule = {
  sendToday(json: string): Promise<boolean>;
  hasWatch(): Promise<boolean>;
  watchWater(date: string): Promise<number>;
  /** Meals picked on the watch, waiting to be added. ref is "saved:<id>" or "meal:<date>:<id>". */
  pendingLogs(): Promise<{ uri: string; ref: string }[]>;
  clearLog(uri: string): Promise<boolean>;
  addListener(event: 'onWatchData', fn: (e: { path: string }) => void): EventSubscription;
};

/** Null on iOS / web, or if the native module isn't in this build. */
export const WearSync: WearSyncModule | null = Platform.OS === 'android' ? requireOptionalNativeModule<WearSyncModule>('WearSync') : null;
