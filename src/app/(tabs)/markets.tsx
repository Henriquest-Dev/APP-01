import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { CatalogRow } from '@/components/catalog-row';
import { CoinAvatar } from '@/components/coin-avatar';
import { PressableScale } from '@/components/pressable-scale';
import { CoinRow } from '@/components/coin-row';
import { Glass } from '@/components/glass';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { fetchMarketsByIds } from '@/lib/api';
import { fetchCatalog, type CatalogCoin } from '@/lib/catalog';
import { useCoinSearch } from '@/hooks/use-coin-search';
import { fetchCoinQuotes } from '@/lib/coin-lookup';
import { isStablecoin, momentumScore } from '@/lib/momentum';
import { useMarket } from '@/state/market';
import { colors, fonts, radius, space } from '@/theme';

type Tab = 'market' | 'catalog';
type Quote = { price: number; change24h?: number };

export default function Markets() {
  const { coins, trending } = useMarket();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'catalog' ? 'catalog' : 'market');
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<CatalogCoin[] | null>(null);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const q = query.trim().toLowerCase();

  // Reload the catalog whenever the screen is shown; prices come from the public
  // market API first and from our own server prices when that is unavailable.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const rows = await fetchCatalog().catch(() => [] as CatalogCoin[]);
        if (!alive) return;
        setCatalog(rows);
        // The Callout server already holds price + 24h change for trending coins and
        // coins with calls; only the rest are asked from the public API (few, to stay
        // under its rate limit).
        const found: Record<string, Quote> = await fetchCoinQuotes(rows.map((r) => r.id)).catch(
          () => ({}) as Record<string, Quote>,
        );
        const missing = rows.filter((r) => !found[r.id]).slice(0, 40);
        if (missing.length) {
          try {
            for (const c of await fetchMarketsByIds(missing.map((r) => r.id)))
              found[c.id] = { price: c.price, change24h: c.change24h };
          } catch {
            // price simply stays blank for those rows
          }
        }
        if (alive) setQuotes(found);
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const remote = useCoinSearch(query);
  const known = new Set([...coins.map((c) => c.id), ...(catalog ?? []).map((c) => c.id)]);
  const remoteHits = remote.hits;

  const catalogList = (catalog ?? []).filter(
    (c) => !q || c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q),
  );
  const list = q
    ? coins.filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
    : coins;

  return (
    <Screen keyboardShouldPersistTaps="handled">
      <Txt size={28} weight="semibold" style={styles.title}>
        {strings.markets}
      </Txt>
      <View style={{ paddingHorizontal: space.lg, marginBottom: space.md }}>
        <Segmented<Tab>
          size="sm"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'market', label: strings.marketTab },
            { value: 'catalog', label: strings.catalogTab },
          ]}
        />
      </View>
      <View style={styles.search}>
        <Search size={18} color={colors.textMuted} strokeWidth={1.9} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={strings.searchAnyCoin}
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.accent}
          style={styles.input}
          autoCorrect={false}
        />
      </View>

      {tab === 'catalog' ? (
        <>
          <Txt size={13} color={colors.textMuted} style={styles.hint}>
            {strings.catalogHint}
          </Txt>
          {catalog === null ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: space.xl }} />
          ) : catalogList.length === 0 && !q ? (
            <Txt size={14} color={colors.textMuted} style={[styles.hint, { textAlign: 'center' }]}>
              {strings.catalogEmpty}
            </Txt>
          ) : (
            <>
              {catalogList.some((c) => c.trendingNow) ? (
                <Glass style={styles.card}>
                  <Txt size={16} weight="semibold" style={styles.cardTitle}>
                    {strings.inTrending}
                  </Txt>
                  {catalogList
                    .filter((c) => c.trendingNow)
                    .map((c, i) => (
                      <CatalogRow
                        key={c.id}
                        coin={c}
                        index={i}
                        price={quotes[c.id]?.price}
                        change24h={quotes[c.id]?.change24h}
                      />
                    ))}
                </Glass>
              ) : null}
              {catalogList.some((c) => !c.trendingNow) ? (
                <Glass style={styles.card}>
                  <Txt size={16} weight="semibold" style={styles.cardTitle}>
                    {strings.historyTitle}
                  </Txt>
                  {catalogList
                    .filter((c) => !c.trendingNow)
                    .map((c, i) => (
                      <CatalogRow
                        key={c.id}
                        coin={c}
                        index={i}
                        price={quotes[c.id]?.price}
                        change24h={quotes[c.id]?.change24h}
                      />
                    ))}
                </Glass>
              ) : null}
            </>
          )}
        </>
      ) : null}

      {tab === 'market' && !q && trending.length > 0 ? (
        <Glass style={styles.card}>
          <Txt size={16} weight="semibold" style={styles.cardTitle}>
            {strings.trending}
          </Txt>
          {trending.slice(0, 7).map((c, i) => (
            <CoinRow key={c.id} {...c} index={i} subtitle={c.rank ? `${c.symbol} · #${c.rank}` : c.symbol} />
          ))}
        </Glass>
      ) : null}

      {tab === 'market' ? (
        <Glass style={styles.card}>
          <Txt size={16} weight="semibold" style={styles.cardTitle}>
            {q ? strings.results : strings.popular}
          </Txt>
          {list.map((c, i) => (
            <CoinRow key={c.id} {...c} index={i} momentum={isStablecoin(c) ? undefined : momentumScore(c)} />
          ))}
        </Glass>
      ) : null}

      {q.length >= 2 ? (
        <Glass style={styles.card}>
          <Txt size={16} weight="semibold" style={styles.cardTitle}>
            {strings.allCoins}
          </Txt>
          {remote.loading ? (
            <ActivityIndicator color={colors.accent} style={{ margin: space.lg }} />
          ) : remoteHits.filter((h) => !known.has(h.id)).length === 0 ? (
            <Txt size={13} color={colors.textMuted} style={{ padding: space.lg }}>
              {remote.failed ? strings.coinUnavailable : strings.noCoinsFound}
            </Txt>
          ) : (
            remoteHits
              .filter((h) => !known.has(h.id))
              .map((h) => (
                <PressableScale
                  key={h.id}
                  accessibilityRole="button"
                  scaleTo={0.98}
                  onPress={() => router.push({ pathname: '/coin/[id]', params: { id: h.id } })}
                  style={styles.hitRow}>
                  <CoinAvatar uri={h.image} symbol={h.symbol} size={36} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt size={15} weight="semibold" numberOfLines={1}>
                      {h.name}
                    </Txt>
                    <Txt size={12} color={colors.textMuted}>
                      {h.symbol}
                      {h.rank ? ` · #${h.rank}` : ''}
                    </Txt>
                  </View>
                </PressableScale>
              ))
          )}
        </Glass>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  hint: { paddingHorizontal: space.lg, marginTop: space.lg },
  title: { paddingHorizontal: space.lg, marginBottom: space.lg },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    paddingHorizontal: space.lg,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15 },
  card: { marginHorizontal: space.lg, marginTop: space.lg, paddingBottom: space.sm },
  cardTitle: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xs },
});
