import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { fetchMarkets, fetchTrending, type TrendingCoin } from '@/lib/api';
import { sampleCoins } from '@/lib/sample';
import { fetchServerPrices } from '@/lib/server-prices';
import type { Coin } from '@/lib/types';

const REFRESH_MS = 60_000;

type MarketState = {
  coins: Coin[];
  trending: TrendingCoin[];
  offline: boolean;
  loading: boolean;
  updatedAt: number | null;
};

const MarketContext = createContext<MarketState | null>(null);

export function MarketProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MarketState>({
    coins: [],
    trending: [],
    offline: false,
    loading: true,
    updatedAt: null,
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      const [markets, trending] = await Promise.allSettled([fetchMarkets(), fetchTrending()]);
      if (!alive) return;
      // Market API down: keep the list but use real prices from our own server.
      let fallback: typeof sampleCoins | null = null;
      if (markets.status !== 'fulfilled' || !markets.value.length) {
        const base = sampleCoins;
        const prices = await fetchServerPrices(base.map((c) => c.symbol)).catch(
          () => ({}) as Record<string, number>,
        );
        if (!alive) return;
        fallback = base.map((c) => {
          const p = prices[c.symbol];
          if (!p) return c;
          const k = p / c.price;
          return {
            ...c,
            price: p,
            high24h: c.high24h * k,
            low24h: c.low24h * k,
            sparkline: c.sparkline.map((v) => v * k),
          };
        });
      }
      setState((prev) => {
        const live = markets.status === 'fulfilled' && markets.value.length > 0;
        return {
          coins: live ? markets.value : prev.coins.length ? prev.coins : (fallback ?? sampleCoins),
          trending: trending.status === 'fulfilled' ? trending.value : prev.trending,
          offline: !live,
          loading: false,
          updatedAt: live ? Date.now() : prev.updatedAt,
        };
      });
    }

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return <MarketContext.Provider value={state}>{children}</MarketContext.Provider>;
}

export function useMarket(): MarketState {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error('useMarket must be used inside MarketProvider');
  return ctx;
}

export function useCoin(id: string | undefined): Coin | undefined {
  return useMarket().coins.find((c) => c.id === id);
}
