import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

export type Consensus = { up: number; down: number; total: number };

/** Live up/down split of open calls for one coin. */
export function useConsensus(coinId: string | undefined): Consensus | null {
  const [value, setValue] = useState<Consensus | null>(null);

  useEffect(() => {
    if (!coinId) return;
    let alive = true;

    const load = async () => {
      const { data } = await supabase
        .from('coin_consensus')
        .select('up_votes, down_votes, total')
        .eq('coin_id', coinId)
        .maybeSingle();
      if (!alive) return;
      setValue(
        data ? { up: data.up_votes, down: data.down_votes, total: data.total } : { up: 0, down: 0, total: 0 },
      );
    };

    load();
    const channel = supabase
      .channel(`consensus-${coinId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calls', filter: `coin_id=eq.${coinId}` },
        load,
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [coinId]);

  return value;
}
