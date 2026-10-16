import { useEffect, useState } from 'react';

import { fetchCoinPrices } from '@/lib/coin-lookup';
import { useMarket } from '@/state/market';

/**
 * Live price for each coin id: from the main market list when the coin is in
 * it, otherwise from the server's price table (so calls on new coins show their
 * real result too). Refreshes every minute.
 */
export function useCoinPrices(coinIds: string[]): Record<string, number> {
  const { coins } = useMarket();
  const missing = [...new Set(coinIds)].filter((id) => !coins.some((c) => c.id === id)).sort();
  const key = missing.join(',');
  const [server, setServer] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!key) return;
    let alive = true;
    const load = () =>
      fetchCoinPrices(key.split(','))
        .then((p) => alive && setServer(p))
        .catch(() => {});
    load();
    const timer = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [key]);

  const out: Record<string, number> = { ...server };
  for (const c of coins) out[c.id] = c.price;
  return out;
}
