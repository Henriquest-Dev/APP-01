import { useEffect, useState } from 'react';

import { searchCoins, type CoinHit } from '@/lib/api';

/** Debounced search over every coin (not only the ones in the app's lists). */
export function useCoinSearch(query: string) {
  const q = query.trim();
  const [state, setState] = useState<{ q: string; hits: CoinHit[]; failed: boolean }>();

  useEffect(() => {
    if (q.length < 2) return;
    let alive = true;
    const t = setTimeout(() => {
      searchCoins(q)
        .then((hits) => alive && setState({ q, hits, failed: false }))
        .catch(() => alive && setState({ q, hits: [], failed: true }));
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const ready = q.length >= 2 && state?.q === q;
  return { hits: ready ? state.hits : [], loading: q.length >= 2 && !ready, failed: ready && state.failed };
}
