import { useEffect, useState } from 'react';

import { fetchLives, type Live } from '@/lib/lives';
import { supabase } from '@/lib/supabase';

/** Running lives, refreshed the moment someone starts or ends one. */
export function useLives(enabled = true) {
  const [lives, setLives] = useState<Live[] | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = () => fetchLives().then((rows) => alive && setLives(rows));
    load();
    const channel = supabase
      .channel(`lives-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lives' }, load)
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [enabled]);

  return lives;
}
