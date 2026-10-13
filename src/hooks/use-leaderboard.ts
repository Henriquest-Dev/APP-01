import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type Leader = { userId: string; username: string; resolved: number; hits: number; accuracy: number };

/** Best callers over the last 30 days (resolved calls only). */
export function useLeaderboard() {
  const [leaders, setLeaders] = useState<Leader[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setLeaders(await fetchLeaders());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    let alive = true;
    fetchLeaders().then((rows) => alive && setLeaders(rows));
    return () => {
      alive = false;
    };
  }, []);

  return { leaders, refreshing, reload: load };
}

async function fetchLeaders(): Promise<Leader[]> {
  const { data } = await supabase
    .from('leaderboard')
    .select('user_id, username, resolved, hits, accuracy')
    .order('accuracy', { ascending: false })
    .order('resolved', { ascending: false })
    .limit(50);
  return (data ?? []).map((r) => ({
    userId: r.user_id,
    username: r.username,
    resolved: r.resolved,
    hits: r.hits,
    accuracy: r.accuracy,
  }));
}
