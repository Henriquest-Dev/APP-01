import type { Coin } from './types';

/**
 * Momentum score (0-100): a transparent, rule-based reading of current market
 * activity. It describes the present, it does not predict the future.
 *
 * Inputs: 24h change, 7d trend, and volume relative to market cap.
 */
export function momentumScore(coin: Coin): number {
  if (isStablecoin(coin)) return 50;
  const change = clamp(coin.change24h, -20, 20) / 20; // -1..1
  const first = coin.sparkline[0];
  const last = coin.sparkline[coin.sparkline.length - 1];
  const trend = first && last ? clamp(((last - first) / first) * 100, -40, 40) / 40 : 0; // -1..1
  const turnover = coin.marketCap > 0 ? coin.volume24h / coin.marketCap : 0;
  const activity = clamp(turnover / 0.25, 0, 1); // 25%+ daily turnover = max

  const raw = 0.4 * change + 0.35 * trend + 0.25 * (activity * 2 - 1); // -1..1
  return Math.round(((raw + 1) / 2) * 100);
}

const STABLES = new Set([
  'USDT',
  'USDC',
  'DAI',
  'FDUSD',
  'USDE',
  'TUSD',
  'PYUSD',
  'USDS',
  'USD1',
  'USDD',
  'FRAX',
  'BUSD',
  'RLUSD',
]);

/** Stablecoins have no meaningful momentum; keep them out of rankings and signals. */
export function isStablecoin(coin: Coin): boolean {
  if (STABLES.has(coin.symbol)) return true;
  const min = Math.min(...coin.sparkline);
  const max = Math.max(...coin.sparkline);
  return coin.price > 0.97 && coin.price < 1.03 && coin.sparkline.length > 1 && (max - min) / max < 0.02;
}

export function momentumLabel(score: number): 'low' | 'neutral' | 'high' {
  if (score >= 65) return 'high';
  if (score <= 35) return 'low';
  return 'neutral';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
