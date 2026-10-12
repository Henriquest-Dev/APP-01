import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { Chips } from '@/components/chips';
import { COIN_CARD_WIDTH, CoinCard } from '@/components/coin-card';
import { CoinRow } from '@/components/coin-row';
import { Disclaimer } from '@/components/disclaimer';
import { IconButton } from '@/components/icon-button';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { isStablecoin, momentumScore } from '@/lib/momentum';
import { useMarket } from '@/state/market';
import { colors, space } from '@/theme';

type Filter = 'top' | 'gainers' | 'losers' | 'momentum';

export default function Home() {
  const { coins, trending, offline, loading } = useMarket();
  const [filter, setFilter] = useState<Filter>('top');

  const featured = coins
    .filter((c) => !isStablecoin(c))
    .sort((a, b) => {
      if (filter === 'gainers') return b.change24h - a.change24h;
      if (filter === 'losers') return a.change24h - b.change24h;
      if (filter === 'momentum') return momentumScore(b) - momentumScore(a);
      return b.marketCap - a.marketCap;
    })
    .slice(0, 8);

  return (
    <Screen>
      <View style={styles.top}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="megaphone" size={18} color={colors.accentInk} />
          </View>
          <View>
            <Txt size={13} color={colors.textMuted}>
              {strings.greeting} 👋
            </Txt>
            <Txt size={17} weight="semibold">
              Callout
            </Txt>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <IconButton
            icon="search"
            label={strings.searchPlaceholder}
            onPress={() => router.push('/markets')}
          />
          <IconButton icon="notifications-outline" label="Notifications" />
        </View>
      </View>

      <Txt size={34} weight="semibold" style={styles.title}>
        {strings.homeTitle}
      </Txt>

      {offline ? (
        <View style={styles.offline}>
          <Ionicons name="cloud-offline-outline" size={14} color={colors.warn} />
          <Txt size={12} color={colors.warn}>
            {strings.offline}
          </Txt>
        </View>
      ) : null}

      <Chips<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'top', label: 'Top' },
          { value: 'gainers', label: `🚀 ${strings.gainers}` },
          { value: 'losers', label: `📉 ${strings.losers}` },
          { value: 'momentum', label: '⚡ Momentum' },
        ]}
      />

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} />
      ) : (
        <FlatList
          horizontal
          data={featured}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <CoinCard coin={item} />}
          showsHorizontalScrollIndicator={false}
          snapToInterval={COIN_CARD_WIDTH + space.md}
          decelerationRate="fast"
          contentContainerStyle={{ gap: space.md, paddingHorizontal: space.lg, marginTop: space.lg }}
        />
      )}

      {trending.length > 0 ? (
        <>
          <SectionHeader title={`🔥 ${strings.trending}`} />
          {trending.slice(0, 7).map((c) => (
            <CoinRow key={c.id} {...c} subtitle={c.rank ? `${c.name} · #${c.rank}` : c.name} />
          ))}
        </>
      ) : null}

      <Disclaimer />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { paddingHorizontal: space.lg, marginTop: space.xl, marginBottom: space.lg, lineHeight: 40 },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.lg,
    marginBottom: space.md,
  },
});
