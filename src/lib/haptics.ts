import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const KEY = 'callout.haptics.v1';
let enabled = true;

AsyncStorage.getItem(KEY)
  .then((v) => {
    if (v === 'off') enabled = false;
  })
  .catch(() => {});

export function hapticsEnabled() {
  return enabled;
}

export function setHapticsEnabled(on: boolean) {
  enabled = on;
  AsyncStorage.setItem(KEY, on ? 'on' : 'off').catch(() => {});
}

/** Vibration feedback that respects the user's setting. */
export const haptic = {
  tap: () => enabled && Haptics.selectionAsync().catch(() => {}),
  impact: () => enabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  success: () =>
    enabled && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  error: () => enabled && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
};
