import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AreaChart } from '@/components/area-chart';
import { ChangePill } from '@/components/change-pill';
import { Chips } from '@/components/chips';
import { CoinAvatar } from '@/components/coin-avatar';
import { ConsensusBar } from '@/components/consensus-bar';
import { Disclaimer } from '@/components/disclaimer';
import { IconButton } from '@/components/icon-button';
import { MomentumMeter, momentumColor } from '@/components/momentum-meter';
import { Price } from '@/components/price';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { fetchChart, fetchCoin, type ChartRange } from '@/lib/api';
import { demoConsensus } from '@/lib/demo';
import { formatCompact, formatPrice } from '@/lib/format';
import { isStablecoin, momentumScore } from '@/lib/momentum';
import type { Coin } from '@/lib/types';
import { useCoin } from '@/state/market';
import { colors, radius, space } from '@/theme';

export default function CoinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cached = useCoin(id);
  const [fetched, setFetched] = useState<Coin>();
  const coin = cached ?? fetched;

  const [range, setRange] = useState<ChartRange>('1');
  const [loaded, setLoaded] = useState<{ key: string; data: number[] }>();
  const chartKey = `${id}:${range}`;
  const chart = loaded?.key === chartKey ? loaded.data : null;

  useEffect(() => {
    if (!cached && id)
      fetchCoin(id)
        .then(setFetched)
        .catch(() => {});
  }, [cached, id]);

  useEffect(() => {
    let alive = true;
    fetchChart(id, range)
      .then((data) => alive && setLoaded({ key: chartKey, data }))
      .catch(() => alive && setLoaded({ key: chartKey, data: [] }));
    return () => {
      alive = false;
    };
  }, [id, range, chartKey]);

  const header = (
    <View style={styles.header}>
      <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
      <Txt size={18} weight="semibold">
        {coin?.name ?? ''}
      </Txt>
      <IconButton icon="bookmark-outline" label="Watchlist" />
    </View>
  );

  if (!coin) {
    return (
      <Screen withTabBar={false} header={header}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} />
      </Screen>
    );
  }

  const series = chart && chart.length > 1 ? chart : coin.sparkline;
  const rising = series.length > 1 ? series[series.length - 1] >= series[0] : coin.change24h >= 0;
  const consensus = demoConsensus(coin.id);
  const score = momentumScore(coin);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen withTabBar={false} header={header} contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={styles.pad}>
          <View style={styles.row}>
            <CoinAvatar uri={coin.image} symbol={coin.symbol} size={26} />
            <Txt size={15} color={colors.textMuted}>
              {coin.symbol} · {strings.price}
            </Txt>
          </View>
          <Price value={coin.price} size={40} />
          <ChangePill value={coin.change24h} />
        </View>

        <View style={{ marginTop: space.lg }}>
          <Chips<ChartRange>
            value={range}
            onChange={setRange}
            options={[
              { value: '1', label: '1D' },
              { value: '7', label: '1W' },
              { value: '30', label: '1M' },
              { value: '365', label: '1Y' },
            ]}
          />
        </View>

        <View style={styles.chart}>
          {chart === null ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <AreaChart data={series} height={220} marker color={rising ? colors.up : colors.down} />
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Txt size={16} weight="semibold">
              {strings.community}
            </Txt>
            <Txt size={12} color={colors.warn} weight="bold">
              {strings.demo} · {consensus.votes} {strings.calls}
            </Txt>
          </View>
          <ConsensusBar up={consensus.up} />
        </View>

        {isStablecoin(coin) ? null : (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Txt size={16} weight="semibold">
                ⚡ {strings.momentum}
              </Txt>
              <Txt size={22} weight="bold" color={momentumColor(score)}>
                {score}
                <Txt size={14} color={colors.textFaint}>
                  /100
                </Txt>
              </Txt>
            </View>
            <MomentumMeter score={score} />
            <Txt size={12} color={colors.textMuted}>
              {strings.momentumHint}
            </Txt>
          </View>
        )}

        <View style={[styles.card, { gap: space.md }]}>
          <Stat label={strings.marketCap} value={formatCompact(coin.marketCap)} />
          <Stat label={strings.volume24h} value={formatCompact(coin.volume24h)} />
          <Stat label={strings.high24h} value={formatPrice(coin.high24h)} />
          <Stat label={strings.low24h} value={formatPrice(coin.low24h)} />
        </View>

        <Disclaimer />
      </Screen>

      <View style={styles.actions}>
        <CallButton direction="down" coinId={coin.id} />
        <CallButton direction="up" coinId={coin.id} />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Txt size={14} color={colors.textMuted}>
        {label}
      </Txt>
      <Txt size={14} weight="semibold">
        {value}
      </Txt>
    </View>
  );
}

function CallButton({ direction, coinId }: { direction: 'up' | 'down'; coinId: string }) {
  const up = direction === 'up';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/call/new', params: { coin: coinId, direction } })}
      style={({ pressed }) => [
        styles.callBtn,
        { backgroundColor: up ? colors.accent : colors.surfaceRaised },
        pressed && { opacity: 0.85 },
      ]}>
      <Txt size={16} weight="semibold" color={up ? colors.accentInk : colors.text}>
        {up ? `↑ ${strings.callUp}` : `↓ ${strings.callDown}`}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  pad: { paddingHorizontal: space.lg, gap: space.sm, marginTop: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  chart: { height: 220, marginTop: space.lg, justifyContent: 'center' },
  card: {
    marginHorizontal: space.lg,
    marginTop: space.lg,
    padding: space.lg,
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.xl,
    backgroundColor: colors.bg,
  },
  callBtn: { flex: 1, height: 58, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
