import { fetchCoin } from './api';
import { supabase } from './supabase';
import type { Coin } from './types';

/**
 * Finds any coin by its id: the public market API first, and if that is down or
 * rate-limited, the Callout server (catalog + server price), so a coin that just
 * started trending can always be opened and called.
 */
export async function lookupCoin(id: string): Promise<Coin | undefined> {
  // The public API can answer 429 when busy: one quick retry before using the server.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const coin = await fetchCoin(id);
      if (coin && coin.price > 0) return coin;
    } catch {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
    }
  }
  const [meta, price] = await Promise.all([
    supabase.from('catalog').select('id, symbol, name, image').eq('id', id).maybeSingle(),
    supabase.from('coin_prices').select('price').eq('coin_id', id).maybeSingle(),
  ]);
  if (!meta.data || !price.data) return undefined;
  const p = Number(price.data.price);
  return {
    id,
    symbol: meta.data.symbol,
    name: meta.data.name,
    image: meta.data.image ?? '',
    price: p,
    change24h: 0,
    marketCap: 0,
    volume24h: 0,
    high24h: p,
    low24h: p,
    sparkline: [],
  };
}

/** Latest server price per coin id (CoinGecko, refreshed every 2 minutes for coins with open calls). */
export async function fetchCoinPrices(ids: string[]): Promise<Record<string, number>> {
  const unique = [...new Set(ids)].filter(Boolean).slice(0, 200);
  if (!unique.length) return {};
  const { data } = await supabase.from('coin_prices').select('coin_id, price').in('coin_id', unique);
  return Object.fromEntries((data ?? []).map((r) => [r.coin_id as string, Number(r.price)]));
}

export type Quote = { price: number; change24h?: number };

/** Price + 24h change from the Callout server (no call to the public market API). */
export async function fetchCoinQuotes(ids: string[]): Promise<Record<string, Quote>> {
  const unique = [...new Set(ids)].filter(Boolean).slice(0, 300);
  if (!unique.length) return {};
  const { data, error } = await supabase
    .from('coin_prices')
    .select('coin_id, price, change_24h')
    .in('coin_id', unique);
  if (error) return {};
  return Object.fromEntries(
    (data ?? []).map((r) => [
      r.coin_id as string,
      { price: Number(r.price), change24h: r.change_24h == null ? undefined : Number(r.change_24h) },
    ]),
  );
}
