import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'ota-analytics-device-id-v1';

export type UpdateAnalyticsEvent = 'detected' | 'downloaded' | 'success' | 'failure';

let deviceIdPromise: Promise<string> | undefined;

async function getDeviceId() {
  deviceIdPromise ??= (async () => {
    const saved = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (saved) return saved;
    const generated = Crypto.randomUUID();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, generated);
    return generated;
  })();
  return deviceIdPromise;
}

export async function reportUpdateAnalytics(
  updateId: string | undefined,
  event: UpdateAnalyticsEvent,
  failureCode?: string,
) {
  if (
    Platform.OS === 'web' ||
    (Platform.OS !== 'android' && Platform.OS !== 'ios') ||
    !Updates.isEnabled ||
    !updateId
  ) {
    return;
  }

  const updateUrl = Constants.expoConfig?.updates?.url;
  const app = Constants.expoConfig?.slug?.toLowerCase();
  if (!updateUrl || !app) return;

  try {
    const baseUrl = new URL(updateUrl);
    await fetch(`${baseUrl.origin}/api/analytics/update`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        app,
        updateId,
        deviceId: await getDeviceId(),
        runtimeVersion: Updates.runtimeVersion,
        platform: Platform.OS,
        event,
        ...(failureCode ? { failureCode } : {}),
      }),
    });
  } catch {
    // Analytics must never delay or interrupt app startup.
  }
}
