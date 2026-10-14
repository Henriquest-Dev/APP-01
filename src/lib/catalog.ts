import { supabase } from './supabase';

export type CatalogCoin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  rank: number | null;
  lastTrendingAt: number;
  timesTrending: number;
  trendingNow: boolean;
  /** Left the trending list and is now back (within the last day). */
  returned: boolean;
};

/**
 * Every coin that has ever trended, trending ones first, then the most
 * recently trending. The server adds new coins every 15 minutes and never
 * removes old ones.
 */
export async function fetchCatalog(limit = 300): Promise<CatalogCoin[]> {
  const { data } = await supabase
    .from('catalog')
    .select(
      'id, symbol, name, image, market_cap_rank, last_trending_at, trending_count, trending_now, returned',
    )
    .order('trending_now', { ascending: false })
    .order('last_trending_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    symbol: r.symbol,
    name: r.name,
    image: r.image ?? '',
    rank: r.market_cap_rank,
    lastTrendingAt: Date.parse(r.last_trending_at),
    timesTrending: r.trending_count,
    trendingNow: !!r.trending_now,
    returned: !!r.returned,
  }));
}
