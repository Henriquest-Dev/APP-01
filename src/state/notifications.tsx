import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { currentLanguage } from '@/i18n';
import {
  alreadyAsked,
  configureNotifications,
  fetchUnreadCount,
  markAllRead,
  pushEnabled,
  registerPush,
  setPushEnabledFlag,
  unregisterPush,
  type PushResult,
} from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { useSession } from './session';

type NotificationsState = {
  unread: number;
  /** Push switch (Settings). */
  enabled: boolean;
  setEnabled: (on: boolean) => Promise<PushResult>;
  markRead: () => Promise<void>;
};

const Ctx = createContext<NotificationsState | null>(null);

if (Platform.OS === 'android') configureNotifications();

/**
 * Unread count (live) and push registration. The first time a signed-in
 * person opens the app we ask for permission once; after that, the Settings
 * switch is in control.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const userId = user?.id;
  const [store, setStore] = useState<{ userId?: string; unread: number }>({ unread: 0 });
  const [enabled, setEnabledState] = useState(true);
  const unread = store.userId === userId ? store.unread : 0;

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    const refresh = () => fetchUnreadCount().then((n) => alive && setStore({ userId, unread: n }));
    refresh();
    const channel = supabase
      .channel(`notifs-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        refresh,
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      const on = await pushEnabled();
      if (!alive) return;
      setEnabledState(on);
      if (on) await registerPush(currentLanguage(), !(await alreadyAsked()));
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  // Tapping a notification opens the inbox.
  useEffect(() => {
    if (!userId || Platform.OS !== 'android') return;
    const open = () => setTimeout(() => router.push('/notifications'), 400);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    Notifications.getLastNotificationResponseAsync()
      .then((r) => {
        if (r) open();
      })
      .catch(() => {});
    return () => sub.remove();
  }, [userId]);

  const setEnabled = useCallback(async (on: boolean): Promise<PushResult> => {
    setEnabledState(on);
    await setPushEnabledFlag(on);
    if (!on) {
      await unregisterPush();
      return 'ok';
    }
    return registerPush(currentLanguage(), true);
  }, []);

  const markRead = useCallback(async () => {
    await markAllRead();
    if (userId) setStore({ userId, unread: 0 });
  }, [userId]);

  const value = useMemo(
    () => ({ unread, enabled, setEnabled, markRead }),
    [unread, enabled, setEnabled, markRead],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications(): NotificationsState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
}
