/**
 * The coin fields sent with a new call, made safe for every coin CoinGecko lists:
 * some have an empty ticker or one longer than the database allows (20), and
 * a few have an id with an underscore.
 */
export function callCoinFields(c: { id: string; symbol: string; name: string; image?: string | null }) {
  const id = c.id.trim().slice(0, 100);
  const name = (c.name.trim() || id).slice(0, 100);
  const symbol = (c.symbol.trim() || name.replace(/\s+/g, '') || id).toUpperCase().slice(0, 20);
  return { coin_id: id, symbol, name, image: c.image || null };
}
