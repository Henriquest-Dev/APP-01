import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  billingAvailable,
  connect,
  fetchProStatus,
  listen,
  loadPlan,
  NOT_PRO,
  restore,
  startPurchase,
  type ProPlan,
  type ProStatus,
} from '@/lib/billing';
import { supabase } from '@/lib/supabase';
import { useSession } from './session';

export type BuyResult = 'started' | 'unavailable' | 'error';

type ProState = ProStatus & {
  /** Google Play price text, e.g. "$4.99/month"; null until loaded or when billing is unavailable. */
  plan: ProPlan | null;
  busy: boolean;
  /** Last purchase attempt failed (not cancelled by the user). */
  failed: boolean;
  buy: () => Promise<BuyResult>;
  restorePurchases: () => Promise<boolean>;
};

const ProContext = createContext<ProState | null>(null);

/**
 * Pro status comes only from the server (subscriptions table, written by the
 * "billing" Edge Function after Google confirms the payment) and flips live
 * through Realtime. Google Play Billing is only used to take the payment.
 */
export function ProProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [store, setStore] = useState<{ userId?: string; status: ProStatus }>({ status: NOT_PRO });
  const [plan, setPlan] = useState<ProPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const status = store.userId === user?.id ? store.status : NOT_PRO;

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const put = (s: ProStatus) => alive && setStore({ userId: user.id, status: s });
    fetchProStatus(user.id).then(put);

    const channel = supabase
      .channel(`pro-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.id}` },
        () => fetchProStatus(user.id).then(put),
      )
      .subscribe();

    let stop = () => {};
    if (billingAvailable) {
      connect()
        .then(async () => {
          if (!alive) return;
          stop = listen(
            (s) => {
              put(s);
              if (alive) {
                setBusy(false);
                setFailed(false);
              }
            },
            (cancelled) => {
              if (!alive) return;
              setBusy(false);
              setFailed(!cancelled);
            },
          );
          const p = await loadPlan();
          if (alive) setPlan(p);
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
      stop();
      supabase.removeChannel(channel);
    };
  }, [user]);

  const buy = useCallback(async (): Promise<BuyResult> => {
    if (!user || !plan) return 'unavailable';
    setBusy(true);
    setFailed(false);
    try {
      await startPurchase(plan, user.id);
      return 'started';
    } catch {
      setBusy(false);
      return 'error';
    }
  }, [user, plan]);

  const restorePurchases = useCallback(async () => {
    if (!user || !billingAvailable) return false;
    setBusy(true);
    try {
      const s = await restore();
      if (s) setStore({ userId: user.id, status: s });
      return !!s?.pro;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }, [user]);

  const value = useMemo<ProState>(
    () => ({ ...status, plan, busy, failed, buy, restorePurchases }),
    [status, plan, busy, failed, buy, restorePurchases],
  );
  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}

export function usePro(): ProState {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error('usePro must be used inside ProProvider');
  return ctx;
}
