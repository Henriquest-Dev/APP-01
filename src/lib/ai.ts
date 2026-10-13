import { currentLanguage } from '@/i18n';
import { momentumScore } from './momentum';
import { supabase } from './supabase';
import type { Coin } from './types';

export type AiResult = { text: string } | { error: 'limit' | 'unavailable' | 'signin' };

/** Asks the server-side AI for a short, neutral reading of this coin's market data. */
export async function analyzeCoin(coin: Coin, series: number[]): Promise<AiResult> {
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return { error: 'signin' };

  const { data, error } = await supabase.functions.invoke('ai', {
    body: {
      coinId: coin.id,
      symbol: coin.symbol,
      price: coin.price,
      change24h: coin.change24h,
      high24h: coin.high24h,
      low24h: coin.low24h,
      volume24h: coin.volume24h,
      marketCap: coin.marketCap,
      momentum: momentumScore(coin),
      series,
      lang: currentLanguage(),
    },
  });

  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    return { error: status === 429 ? 'limit' : status === 401 ? 'signin' : 'unavailable' };
  }
  return typeof data?.text === 'string' && data.text ? { text: data.text } : { error: 'unavailable' };
}
