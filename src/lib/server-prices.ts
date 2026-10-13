import { supabase } from './supabase';

/**
 * Latest prices from the Callout server (refreshed every 2 min from MEXC).
 * Used as the fallback when the public market API is unavailable, and as the
 * reference for open calls since it's the same price that settles them.
 */
export async function fetchServerPrices(symbols: string[]): Promise<Record<string, number>> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))].filter(Boolean);
  if (!unique.length) return {};
  const { data } = await supabase.from('prices').select('symbol, price').in('symbol', unique);
  const out: Record<string, number> = {};
  for (const row of data ?? []) out[row.symbol] = Number(row.price);
  return out;
}
