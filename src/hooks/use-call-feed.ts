import { useCallback, useEffect, useState } from 'react';

import { fetchFeed, hydrateFeedCall, type FeedCall } from '@/lib/community';
import { supabase } from '@/lib/supabase';

/**
 * Live list of calls (everyone's, one user's, or one coin's).
 * New calls and resolutions arrive over Realtime within about a second.
 */
export function useCallFeed(
  opts: { userId?: string; coinId?: string; limit?: number; enabled?: boolean } = {},
) {
  const { userId, coinId, limit = 50, enabled = true } = opts;
  const [calls, setCalls] = useState<FeedCall[] | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  const reload = useCallback(async () => {
    setCalls(await fetchFeed({ userId, coinId, limit }));
  }, [userId, coinId, limit]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetchFeed({ userId, coinId, limit }).then((rows) => alive && setCalls(rows));

    const filter = coinId ? `coin_id=eq.${coinId}` : userId ? `user_id=eq.${userId}` : undefined;
    const channel = supabase
      .channel(`feed-${coinId ?? userId ?? 'all'}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'calls', ...(filter ? { filter } : {}) },
        async (p) => {
          const row = await hydrateFeedCall((p.new as { id: string }).id);
          if (!alive || !row) return;
          setCalls((prev) =>
            prev?.some((c) => c.id === row.id) ? prev : [row, ...(prev ?? [])].slice(0, limit),
          );
          setFreshIds((prev) => new Set(prev).add(row.id));
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'calls', ...(filter ? { filter } : {}) },
        (p) => {
          const r = p.new as { id: string; status: FeedCall['status']; exit_price: number | null };
          setCalls(
            (prev) =>
              prev?.map((c) =>
                c.id === r.id
                  ? {
                      ...c,
                      status: r.status,
                      exitPrice: r.exit_price == null ? undefined : Number(r.exit_price),
                    }
                  : c,
              ) ?? prev,
          );
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [userId, coinId, limit, enabled]);

  return { calls, freshIds, reload };
}
