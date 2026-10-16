const MEXC = 'https://api.mexc.com/api/v3/ticker/price';
const GECKO = 'https://api.coingecko.com/api/v3/simple/price';

/** Last traded price on MEXC (free, no key, fast). 'invalid' means the coin is not listed there. */
export async function fetchMexcPrice(symbol: string): Promise<number | 'invalid' | null> {
  try {
    const res = await fetch(`${MEXC}?symbol=${encodeURIComponent(symbol.toUpperCase())}USDT`, {
      headers: { accept: 'application/json' },
    });
    if (res.status === 400) return 'invalid';
    if (!res.ok) return null;
    const data = (await res.json()) as { price?: string };
    const p = Number(data.price);
    return Number.isFinite(p) && p > 0 ? p : null;
  } catch {
    return null;
  }
}

/** Fallback for coins MEXC does not list: CoinGecko by id (slower, rate-limited). */
export async function fetchGeckoPrice(id: string): Promise<number | null> {
  try {
    const res = await fetch(`${GECKO}?ids=${encodeURIComponent(id)}&vs_currencies=usd&precision=full`, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, { usd?: number }>;
    const p = data[id]?.usd;
    return typeof p === 'number' && p > 0 ? p : null;
  } catch {
    return null;
  }
}
