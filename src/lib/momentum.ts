import type { Coin } from './types';

/**
 * Momentum score (0-100): a transparent, rule-based reading of current market
 * activity. It describes the present, it does not predict the future.
 *
 * Inputs: 24h change, 7d trend, and volume relative to market cap.
 */
export function momentumScore(coin: Coin): number {
  return Math.round(momentumRaw(coin));
}

/** The same score without rounding (used by the live chart, where tiny moves matter). */
export function momentumRaw(coin: Coin): number {
  if (isStablecoin(coin)) return 50;
  const change = clamp(coin.change24h, -20, 20) / 20; // -1..1
  const first = coin.sparkline[0];
  const last = coin.sparkline[coin.sparkline.length - 1];
  const trend = first && last ? clamp(((last - first) / first) * 100, -40, 40) / 40 : 0; // -1..1
  const turnover = coin.marketCap > 0 ? coin.volume24h / coin.marketCap : 0;
  const activity = clamp(turnover / 0.25, 0, 1); // 25%+ daily turnover = max

  const raw = 0.4 * change + 0.35 * trend + 0.25 * (activity * 2 - 1); // -1..1
  return ((raw + 1) / 2) * 100;
}

/**
 * How the score has evolved over the last hours, rebuilt from the 7-day hourly
 * prices (so the live chart starts with history instead of an empty line).
 */
export function momentumHistory(coin: Coin, points = 48): number[] {
  const s = coin.sparkline;
  if (s.length < 30) return [];
  const out: number[] = [];
  for (let i = Math.max(24, s.length - points); i < s.length; i++) {
    const price = s[i];
    const change = ((price - s[i - 24]) / s[i - 24]) * 100;
    out.push(momentumRaw({ ...coin, price, change24h: change, sparkline: s.slice(0, i + 1) }));
  }
  // End exactly on the current score so the history and the live part join up.
  out[out.length - 1] = momentumRaw(coin);
  return out;
}

/** The score if the price were `price` right now (24h change and trend follow the live price). */
export function liveMomentum(coin: Coin, price: number): number {
  const factor = 1 + coin.change24h / 100;
  const open = factor > 0.01 ? coin.price / factor : coin.price;
  const change24h = open > 0 ? (price / open - 1) * 100 : coin.change24h;
  const sparkline = coin.sparkline.length ? [...coin.sparkline.slice(0, -1), price] : coin.sparkline;
  return momentumRaw({ ...coin, price, change24h, sparkline });
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
