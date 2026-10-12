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
  // Deterministic random walk that ends at the current price.
  let seed = 11 + i * 97;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  const walk = [0];
  for (let k = 1; k < 84; k++) walk.push(walk[k - 1] + rand() * 0.012 + change / 100 / 84);
  const end = walk[walk.length - 1];
  const sparkline = walk.map((w) => price * (1 + w - end));
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
