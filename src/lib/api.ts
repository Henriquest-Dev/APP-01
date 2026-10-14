import type { Coin } from './types';

/**
 * Market data. For now the app talks to CoinGecko's public API directly;
 * this moves behind the Callout backend (WebSocket) in the next phase.
 */
const BASE = 'https://api.coingecko.com/api/v3';

export type TrendingCoin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
  rank: number | null;
};

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchMarkets(perPage = 50): Promise<Coin[]> {
  const rows = await get<any[]>(
    `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=1&sparkline=true&price_change_percentage=24h`,
  );
  return rows.map(toCoin);
}

export async function fetchCoin(id: string): Promise<Coin | undefined> {
  const rows = await get<any[]>(
    `/coins/markets?vs_currency=usd&ids=${encodeURIComponent(id)}&sparkline=true&price_change_percentage=24h`,
  );
  return rows[0] ? toCoin(rows[0]) : undefined;
}

function toCoin(r: any): Coin {
  return {
    id: r.id,
    symbol: String(r.symbol).toUpperCase(),
    name: r.name,
    image: r.image,
    price: r.current_price ?? 0,
    change24h: r.price_change_percentage_24h ?? 0,
    marketCap: r.market_cap ?? 0,
    volume24h: r.total_volume ?? 0,
    high24h: r.high_24h ?? 0,
    low24h: r.low_24h ?? 0,
    sparkline: r.sparkline_in_7d?.price ?? [],
  };
}

export async function fetchTrending(): Promise<TrendingCoin[]> {
  const data = await get<{ coins: { item: any }[] }>('/search/trending');
  return data.coins.map(({ item }) => ({
    id: item.id,
    symbol: String(item.symbol).toUpperCase(),
    name: item.name,
    image: item.large ?? item.small ?? item.thumb,
    price: Number(item.data?.price ?? 0),
    change24h: Number(item.data?.price_change_percentage_24h?.usd ?? 0),
    rank: item.market_cap_rank ?? null,
  }));
}

export type ChartRange = '1' | '7' | '30' | '365';

export async function fetchChart(id: string, days: ChartRange): Promise<number[]> {
  const data = await get<{ prices: [number, number][] }>(
    `/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`,
  );
  return data.prices.map(([, price]) => price);
}

/** Prices for specific coins (used by the catalog). Chunked to keep the URL short. */
export async function fetchMarketsByIds(ids: string[]): Promise<Coin[]> {
  const out: Coin[] = [];
  for (let i = 0; i < ids.length; i += 80) {
    const chunk = ids.slice(i, i + 80).map(encodeURIComponent).join(',');
    const rows = await get<any[]>(
      `/coins/markets?vs_currency=usd&ids=${chunk}&per_page=80&page=1&sparkline=true&price_change_percentage=24h`,
    );
    out.push(...rows.map(toCoin));
  }
  return out;
}
