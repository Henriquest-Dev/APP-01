import { currentLanguage, strings } from '@/i18n';
import { momentumScore } from './momentum';
import { supabase } from './supabase';
import type { Coin } from './types';

export type AiMode = 'summary' | 'technical';

export type AiResult = { text: string } | { error: 'limit' | 'unavailable' | 'signin' };

/** Asks the server-side AI for a neutral reading of this coin's market data. */
export async function analyzeCoin(
  coin: Coin,
  series: number[],
  rangeDays: number,
  mode: AiMode,
): Promise<AiResult> {
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
      rangeDays,
      mode,
      lang: currentLanguage(),
    },
  });

  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    return { error: status === 429 ? 'limit' : status === 401 ? 'signin' : 'unavailable' };
  }
  return typeof data?.text === 'string' && data.text ? { text: data.text } : { error: 'unavailable' };
}

export type AiSectionKey = 'context' | 'trend' | 'levels' | 'volume' | 'signals' | 'risks';

export type AiSection = { key: AiSectionKey | null; body: string };

const KEYS: AiSectionKey[] = ['context', 'trend', 'levels', 'volume', 'signals', 'risks'];

/** Splits "[[context]] text [[risks]] text" into labelled sections (falls back to one block). */
export function parseAnalysis(text: string): AiSection[] {
  const parts = text.split(/\[\[(\w+)\]\]/);
  const sections: AiSection[] = [];
  const lead = parts[0].trim();
  if (lead) sections.push({ key: null, body: lead });
  for (let i = 1; i < parts.length; i += 2) {
    const body = (parts[i + 1] ?? '').trim();
    if (!body) continue;
    const key = KEYS.find((k) => k === parts[i].toLowerCase()) ?? null;
    sections.push({ key, body });
  }
  return sections;
}

export function sectionTitle(key: AiSectionKey): string {
  switch (key) {
    case 'context':
      return strings.aiSecContext;
    case 'trend':
      return strings.aiSecTrend;
    case 'levels':
      return strings.aiSecLevels;
    case 'volume':
      return strings.aiSecVolume;
    case 'signals':
      return strings.aiSecSignals;
    case 'risks':
      return strings.aiSecRisks;
  }
}
