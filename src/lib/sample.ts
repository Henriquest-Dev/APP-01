import type { Coin } from './types';

/** Offline fallback so the app is never empty when the network fails. */
const seeds: [string, string, string, number, number, number][] = [
  ['bitcoin', 'BTC', 'Bitcoin', 82400, -1.6, 1.65e12],
  ['ethereum', 'ETH', 'Ethereum', 3960, 1.8, 4.8e11],
  ['solana', 'SOL', 'Solana', 182, 3.4, 9.1e10],
  ['binancecoin', 'BNB', 'BNB', 640, 0.4, 9.3e10],
  ['ripple', 'XRP', 'XRP', 2.41, -0.8, 1.4e11],
  ['dogecoin', 'DOGE', 'Dogecoin', 0.21, 5.2, 3.1e10],
];

export const sampleCoins: Coin[] = seeds.map(([id, symbol, name, price, change, cap], i) => {
  const sparkline = Array.from({ length: 48 }, (_, k) => {
    const wave = Math.sin((k + i * 3) / 5) * 0.03 + Math.cos((k + i) / 9) * 0.02;
    return price * (1 + wave + (change / 100) * (k / 47) - change / 200);
  });
  return {
    id,
    symbol,
    name,
    image: '',
    price,
    change24h: change,
    marketCap: cap,
    volume24h: cap * 0.04,
    high24h: price * 1.02,
    low24h: price * 0.97,
    sparkline,
  };
});
