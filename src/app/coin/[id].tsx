import { router, useLocalSearchParams } from 'expo-router';
import {
  Activity,
  Bookmark,
  ChevronLeft,
  CircleDollarSign,
  MoveHorizontal,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AreaChart } from '@/components/area-chart';
import { ChangePill } from '@/components/change-pill';
import { CoinAvatar } from '@/components/coin-avatar';
import { ConsensusBar } from '@/components/consensus-bar';
import { Glass } from '@/components/glass';
import { IconButton } from '@/components/icon-button';
import { AiAnalysis } from '@/components/ai-analysis';
import { MomentumLive } from '@/components/momentum-live';
import { PressableScale } from '@/components/pressable-scale';
import { Price } from '@/components/price';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { fetchChart, fetchCoin, type ChartRange } from '@/lib/api';
import { formatCompact, formatPrice } from '@/lib/format';
import { isStablecoin } from '@/lib/momentum';
import type { Coin } from '@/lib/types';
import { FeedCallCard } from '@/components/feed-call-card';
import { LiveDot } from '@/components/live-dot';
import { useCallFeed } from '@/hooks/use-call-feed';
import { useLivePrice } from '@/hooks/use-live-price';
import { useConsensus } from '@/hooks/use-consensus';
import { useCoin } from '@/state/market';
import { colors, motion, radius, space } from '@/theme';

export default function CoinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const cached = useCoin(id);
  const consensus = useConsensus(id);
  const { calls: coinCalls, freshIds } = useCallFeed({ coinId: id, limit: 6 });
  const [fetched, setFetched] = useState<Coin>();
  const coin = cached ?? fetched;
  const live = useLivePrice(coin);

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
      <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
      {coin ? (
        <View style={styles.headerTitle}>
          <CoinAvatar uri={coin.image} symbol={coin.symbol} size={22} />
          <Txt size={16} weight="semibold">
            {coin.name}
          </Txt>
        </View>
      ) : null}
      <IconButton icon={Bookmark} label="Watchlist" />
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
  const liveChange =
    live.price !== null && coin.price > 0 && coin.change24h > -99
      ? (live.price / (coin.price / (1 + coin.change24h / 100)) - 1) * 100
      : coin.change24h;
  const dayRange =
    coin.high24h > coin.low24h ? (coin.price - coin.low24h) / (coin.high24h - coin.low24h) : 0.5;

  const footer = (
    <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
      <CallButton direction="down" coinId={coin.id} />
      <CallButton direction="up" coinId={coin.id} />
    </View>
  );

  return (
    <Screen
      withTabBar={false}
      header={header}
      footer={footer}
      contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
      <Animated.View entering={FadeInDown.duration(motion.base)} style={styles.pad}>
        <Txt size={13} color={colors.textMuted}>
          {coin.symbol} · {strings.price}
        </Txt>
        <Price value={live.price ?? coin.price} size={40} />
        <ChangePill value={liveChange} plain />
      </Animated.View>

      <View style={styles.chart}>
        {chart === null ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <AreaChart
            key={chartKey}
            data={series}
            height={210}
            marker
            color={rising ? colors.up : colors.down}
          />
        )}
      </View>

      <View style={{ paddingHorizontal: space.lg }}>
        <Segmented<ChartRange>
          size="sm"
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

      <Animated.View entering={FadeInDown.delay(100).duration(motion.base)}>
        <Glass style={styles.card}>
          <CardTitle
            icon={Users}
            title={strings.community}
            right={consensus && consensus.total > 0 ? `${consensus.total} ${strings.calls}` : undefined}
          />
          {consensus && consensus.total > 0 ? (
            <ConsensusBar up={Math.round((consensus.up / consensus.total) * 100)} />
          ) : (
            <Txt size={14} color={colors.textMuted}>
              {consensus ? strings.beFirst : '…'}
            </Txt>
          )}
        </Glass>
      </Animated.View>

      {isStablecoin(coin) ? null : (
        <Animated.View entering={FadeInDown.delay(160).duration(motion.base)}>
          <Glass style={styles.card}>
            <MomentumLive coin={coin} live={live} />
          </Glass>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(180).duration(motion.base)}>
        <AiAnalysis coin={coin} series={series} rangeDays={chart && chart.length > 1 ? Number(range) : 7} />
      </Animated.View>

      {coinCalls && coinCalls.length > 0 ? (
        <Animated.View entering={FadeInDown.delay(200).duration(motion.base)} style={styles.callsBlock}>
          <View style={styles.cardHead}>
            <Txt size={16} weight="semibold">
              {strings.communityCalls}
            </Txt>
            <LiveDot />
          </View>
          {coinCalls.map((c) => (
            <FeedCallCard key={c.id} call={c} livePrice={coin.price} fresh={freshIds.has(c.id)} compact />
          ))}
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(220).duration(motion.base)}>
        <Glass style={[styles.card, { gap: space.lg }]}>
          <Txt size={16} weight="semibold">
            {strings.keyStats}
          </Txt>
          <Stat icon={CircleDollarSign} label={strings.marketCap} value={formatCompact(coin.marketCap)} />
          <Stat icon={Activity} label={strings.volume24h} value={formatCompact(coin.volume24h)} />
          <View style={{ gap: 10 }}>
            <Stat icon={MoveHorizontal} label={strings.range24h} value="" />
            <RangeBar position={dayRange} />
            <View style={styles.rangeLabels}>
              <Txt size={12} color={colors.textMuted} numeric>
                {formatPrice(coin.low24h)}
              </Txt>
              <Txt size={12} color={colors.textMuted} numeric>
                {formatPrice(coin.high24h)}
              </Txt>
            </View>
          </View>
        </Glass>
      </Animated.View>
    </Screen>
  );
}

function CardTitle({ icon: Icon, title, right }: { icon: LucideIcon; title: string; right?: string }) {
  return (
    <View style={styles.cardHead}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon size={17} color={colors.textMuted} strokeWidth={1.9} />
        <Txt size={16} weight="semibold">
          {title}
        </Txt>
      </View>
      {right ? (
        <Txt size={11} weight="semibold" color={colors.textMuted}>
          {right}
        </Txt>
      ) : null}
    </View>
  );
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icon size={16} color={colors.textMuted} strokeWidth={1.9} />
        <Txt size={14} color={colors.textMuted}>
          {label}
        </Txt>
      </View>
      <Txt size={14} weight="semibold" numeric>
        {value}
      </Txt>
    </View>
  );
}

function RangeBar({ position }: { position: number }) {
  const p = Math.min(1, Math.max(0, position));
  return (
    <View style={styles.rangeTrack}>
      <View style={[styles.rangeFill, { width: `${p * 100}%` }]} />
      <View style={[styles.rangeKnob, { left: `${p * 100}%` }]} />
    </View>
  );
}

function CallButton({ direction, coinId }: { direction: 'up' | 'down'; coinId: string }) {
  const up = direction === 'up';
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/call/new', params: { coin: coinId, direction } })}
      style={[styles.callBtn, up ? styles.callUp : styles.callDown]}>
      <Icon size={18} color={colors.text} strokeWidth={2.2} />
      <Txt size={15} weight="semibold">
        {up ? strings.callUp : strings.callDown}
      </Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pad: { paddingHorizontal: space.lg, gap: 4, marginTop: space.md },
  chart: { height: 210, marginVertical: space.lg, justifyContent: 'center' },
  card: { marginHorizontal: space.lg, marginTop: space.lg, padding: space.lg, gap: space.md },
  callsBlock: { marginHorizontal: space.lg, marginTop: space.lg, gap: space.md },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stat: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rangeTrack: { height: 4, borderRadius: 2, backgroundColor: colors.surfaceRaised },
  rangeFill: { height: 4, borderRadius: 2, backgroundColor: colors.accent },
  rangeKnob: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    marginLeft: -6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: 'rgba(11, 12, 20, 0.92)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  callBtn: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    gap: 8,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callUp: { backgroundColor: colors.accent },
  callDown: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
});
