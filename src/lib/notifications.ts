import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

const ENABLED_KEY = 'callout.push.enabled.v1';
const ASKED_KEY = 'callout.push.asked.v1';
const TOKEN_KEY = 'callout.push.token.v1';

export type AppNotification = {
  id: number;
  kind: 'call_hit' | 'call_miss' | 'follow';
  data: { symbol?: string; coin_id?: string; handle?: string; name?: string; follower_id?: string };
  createdAt: number;
  read: boolean;
};

/** Show notifications that arrive while the app is open, too. */
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Push is on by default; Settings can turn it off. */
export async function pushEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) !== 'off';
  } catch {
    return true;
  }
}

export async function setPushEnabledFlag(on: boolean) {
  try {
    await AsyncStorage.setItem(ENABLED_KEY, on ? 'on' : 'off');
  } catch {
    // keep going: the server-side token is what matters
  }
}

export type PushResult = 'ok' | 'denied' | 'unavailable';

/**
 * Gets this phone's FCM token and stores it on the server. `askUser` allows
 * showing the system permission prompt (used once automatically, and whenever
 * the user flips the switch in Settings).
 */
export async function registerPush(lang: string, askUser: boolean): Promise<PushResult> {
  if (Platform.OS !== 'android') return 'unavailable';
  try {
    // Android 13+ shows the permission prompt only after a channel exists.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Callout',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#8B6CFF',
    });
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && askUser) {
      perm = await Notifications.requestPermissionsAsync();
      await AsyncStorage.setItem(ASKED_KEY, '1').catch(() => {});
    }
    if (!perm.granted) return 'denied';
    const token = (await Notifications.getDevicePushTokenAsync()).data;
    if (typeof token !== 'string') return 'unavailable';
    const { error } = await supabase.rpc('register_push_token', { t: token, l: lang });
    if (error) return 'unavailable';
    await AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {});
    return 'ok';
  } catch {
    // e.g. the build has no Firebase file yet: the in-app inbox still works.
    return 'unavailable';
  }
}

/** True once the system prompt has been shown (so we never nag). */
export async function alreadyAsked(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ASKED_KEY)) === '1';
  } catch {
    return true;
  }
}

export async function unregisterPush() {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) await supabase.rpc('unregister_push_token', { t: token });
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // nothing to remove
  }
}

function toNotification(r: any): AppNotification {
  return {
    id: r.id,
    kind: r.kind,
    data: r.data ?? {},
    createdAt: Date.parse(r.created_at),
    read: !!r.read_at,
  };
}

export async function fetchNotifications(limit = 60): Promise<AppNotification[]> {
  const { data } = await supabase
    .from('notifications')
    .select('id, kind, data, created_at, read_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map(toNotification);
}

export async function fetchUnreadCount(): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  return count ?? 0;
}

export async function markAllRead() {
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
}
