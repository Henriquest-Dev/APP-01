import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';
import type { Call, CallStatus, Direction, Timeframe } from '@/lib/types';
import { useSession } from './session';

export type CallError = 'duplicate' | 'limit' | 'priceMoved' | 'target' | 'account' | 'network' | 'unknown';

type NewCall = Omit<Call, 'id' | 'createdAt' | 'expiresAt' | 'status' | 'exitPrice'>;

type CallsState = {
  calls: Call[];
  loading: boolean;
  addCall: (call: NewCall) => Promise<CallError | null>;
  refresh: () => Promise<void>;
};

type Row = {
  id: string;
  coin_id: string;
  symbol: string;
  name: string;
  image: string | null;
  direction: Direction;
  entry_price: number;
  target_price: number | null;
  timeframe: Timeframe;
  created_at: string;
  expires_at: string;
  status: CallStatus;
  exit_price: number | null;
  note: string | null;
};

const COLUMNS =
  'id, coin_id, symbol, name, image, direction, entry_price, target_price, timeframe, created_at, expires_at, status, exit_price, note';

export function toCall(r: Row): Call {
  return {
    id: r.id,
    coinId: r.coin_id,
    symbol: r.symbol,
    name: r.name,
    image: r.image ?? '',
    direction: r.direction,
    entryPrice: Number(r.entry_price),
    targetPrice: r.target_price == null ? undefined : Number(r.target_price),
    timeframe: r.timeframe,
    createdAt: Date.parse(r.created_at),
    expiresAt: Date.parse(r.expires_at),
    status: r.status,
    exitPrice: r.exit_price == null ? undefined : Number(r.exit_price),
    note: r.note ?? undefined,
  };
}

async function fetchMyCalls(userId: string): Promise<Call[] | null> {
  const { data } = await supabase
    .from('calls')
    .select(COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);
  return data ? (data as Row[]).map(toCall) : null;
}

function mapError(message: string | undefined): CallError {
  const m = (message ?? '').toLowerCase();
  if (m.includes('already have an open call')) return 'duplicate';
  if (m.includes('daily call limit')) return 'limit';
  if (m.includes('too far from the market')) return 'priceMoved';
  if (m.includes('target must be')) return 'target';
  if (m.includes('fetch') || m.includes('network')) return 'network';
  return 'unknown';
}

const CallsContext = createContext<CallsState | null>(null);

/** The signed-in user's calls, stored in Supabase and kept live via Realtime. */
export function CallsProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const userId = user?.id;
  // Calls are kept per user so a sign-out never shows the previous account's list.
  const [store, setStore] = useState<{ userId?: string; calls: Call[] }>({ calls: [] });
  const calls = store.userId === userId ? store.calls : [];
  const setCalls = useCallback(
    (update: (prev: Call[]) => Call[]) =>
      setStore((s) => ({ userId, calls: update(s.userId === userId ? s.calls : []) })),
    [userId],
  );
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const rows = await fetchMyCalls(userId);
    if (rows) setCalls(() => rows);
    setLoading(false);
  }, [userId, setCalls]);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    fetchMyCalls(userId).then((rows) => alive && rows && setCalls(() => rows));
    // Resolutions (hit/miss) arrive as updates from the server.
    const channel = supabase
      .channel(`my-calls-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calls', filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as Row | undefined;
          if (!row?.id) return;
          setCalls((prev) => {
            const next = toCall(row);
            const exists = prev.some((c) => c.id === next.id);
            return exists ? prev.map((c) => (c.id === next.id ? next : c)) : [next, ...prev];
          });
        },
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [userId, setCalls]);

  const addCall: CallsState['addCall'] = async (call) => {
    if (!userId) return 'account';
    const { data, error } = await supabase
      .from('calls')
      .insert({
        coin_id: call.coinId,
        symbol: call.symbol,
        name: call.name,
        image: call.image || null,
        direction: call.direction,
        entry_price: call.entryPrice,
        target_price: call.targetPrice ?? null,
        timeframe: call.timeframe,
        note: call.note?.trim() || null,
      })
      .select(COLUMNS)
      .single();
    if (error) return mapError(error.message);
    const created = toCall(data as Row);
    setCalls((prev) => (prev.some((c) => c.id === created.id) ? prev : [created, ...prev]));
    return null;
  };

  return (
    <CallsContext.Provider value={{ calls, loading, addCall, refresh }}>{children}</CallsContext.Provider>
  );
}

export function useCalls(): CallsState {
  const ctx = useContext(CallsContext);
  if (!ctx) throw new Error('useCalls must be used inside CallsProvider');
  return ctx;
}
