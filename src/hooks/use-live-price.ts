import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { fetchGeckoPrice, fetchMexcPrice } from '@/lib/live-price';
import type { Coin } from '@/lib/types';

export type LivePrice = {
  /** Latest live price, or null until the first one arrives. */
  price: number | null;
  /** Every live price seen on this screen, oldest first (kept to 240). */
  ticks: number[];
  /** +1 / -1 for the last move, 0 if unchanged or unknown. */
  direction: 1 | -1 | 0;
  source: 'mexc' | 'coingecko' | null;
};

const EMPTY: LivePrice = { price: null, ticks: [], direction: 0, source: null };

/**
 * Real-time price of one coin: polls MEXC every 3 seconds (the coin must be
 * listed there and its price must agree with the market API, so a different
 * coin that shares the ticker is never mixed in) and falls back to CoinGecko
 * every 20 seconds. Pauses while the app is in the background.
 */
export function useLivePrice(coin: Coin | undefined): LivePrice {
  const id = coin?.id;
  const symbol = coin?.symbol;
  const baseRef = useRef(coin?.price ?? 0);
  const [state, setState] = useState<LivePrice & { id?: string }>(EMPTY);

  useEffect(() => {
    baseRef.current = coin?.price ?? 0;
  }, [coin?.price]);

  useEffect(() => {
    if (!id || !symbol) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let mode: 'mexc' | 'coingecko' = 'mexc';
    let misses = 0;

    const push = (price: number, source: 'mexc' | 'coingecko') =>
      setState((prev) => {
        const ticks = prev.id === id ? prev.ticks : [];
        const last = ticks[ticks.length - 1];
        if (last === price) return prev.id === id ? prev : { ...EMPTY, id, price, ticks: [price], source };
        return {
          id,
          price,
          source,
          ticks: [...ticks, price].slice(-240),
          direction: last === undefined ? 0 : price > last ? 1 : -1,
        };
      });

    const step = async () => {
      if (!alive) return;
      if (AppState.currentState === 'active') {
        if (mode === 'mexc') {
          const r = await fetchMexcPrice(symbol);
          const base = baseRef.current;
          if (r === 'invalid' || (typeof r === 'number' && base > 0 && Math.abs(r / base - 1) > 0.3)) {
            mode = 'coingecko';
          } else if (typeof r === 'number') {
            misses = 0;
            if (alive) push(r, 'mexc');
          } else if (++misses >= 5) {
            mode = 'coingecko';
          }
        }
        if (mode === 'coingecko') {
          const g = await fetchGeckoPrice(id);
          if (g && alive) push(g, 'coingecko');
        }
      }
      if (alive) timer = setTimeout(step, mode === 'mexc' ? 3000 : 20000);
    };
    step();

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id, symbol]);

  return state.id === id && id ? state : EMPTY;
}
