import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system/legacy';
import type { DeviceInfo } from './capability';

export async function readDevice(): Promise<DeviceInfo> {
  let free: number | null = null;
  try {
    free = await FileSystem.getFreeDiskStorageAsync();
  } catch {
    // the recommendation just skips the storage check
  }
  const archs = Device.supportedCpuArchitectures ?? [];
  return {
    name: Device.modelName ?? 'This phone',
    ramBytes: Device.totalMemory,
    freeBytes: free,
    is64Bit: Platform.OS !== 'android' || archs.length === 0 || archs.some((a) => /arm64|x86_64/i.test(a)),
    androidApi: Platform.OS === 'android' ? Number(Platform.Version) : null,
  };
}
