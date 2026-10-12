import { router } from 'expo-router';
import { Flame, Plus, Search, Settings2, Trophy, WifiOff, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AreaChart } from '@/components/area-chart';
import { ChangePill } from '@/components/change-pill';
import { CoinRow } from '@/components/coin-row';
import { Disclaimer } from '@/components/disclaimer';
import { Glass } from '@/components/glass';
import { IconButton } from '@/components/icon-button';
import { AnimatedLogo, ProLogo } from '@/components/animated-logo';
import { PressableScale } from '@/components/pressable-scale';
import { Price } from '@/components/price';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { Segmented } from '@/components/segmented';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { formatPrice } from '@/lib/format';
import { isStablecoin, momentumScore } from '@/lib/momentum';
import { useMarket } from '@/state/market';
import { colors, motion, radius, space } from '@/theme';

type Featured = 'bitcoin' | 'ethereum' | 'solana';
type Filter = 'top' | 'gainers' | 'losers' | 'momentum';

export default function Home() {
  const { coins, trending, offline, loading } = useMarket();
  const [featuredId, setFeaturedId] = useState<Featured>('bitcoin');
  const [filter, setFilter] = useState<Filter>('top');

  const featured = coins.find((c) => c.id === featuredId) ?? coins[0];
  const weekChange = featured && featured.sparkline.length > 1 ? featured.price - featured.sparkline[0] : 0;

  const list = coins
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
          <AnimatedLogo size={38} />
          <Txt size={19} weight="semibold">
            Callout
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <IconButton
            icon={Search}
            label={strings.searchPlaceholder}
            onPress={() => router.push('/markets')}
          />
          <IconButton icon={Settings2} label={strings.settings} onPress={() => router.push('/settings')} />
        </View>
      </View>

      {offline ? (
        <View style={styles.offline}>
          <WifiOff size={13} color={colors.warn} strokeWidth={2} />
          <Txt size={12} color={colors.warn}>
            {strings.offline}
          </Txt>
        </View>
      ) : null}

      {loading || !featured ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 80 }} />
      ) : (
        <>
          <Animated.View entering={FadeIn.duration(motion.base)} style={styles.hero}>
            <View style={{ paddingHorizontal: space.lg }}>
              <Txt size={13} color={colors.textMuted}>
                {featured.name} · {strings.price}
              </Txt>
              <Price value={featured.price} size={38} />
              <View style={styles.heroChange}>
                <ChangePill value={featured.change24h} plain />
                <Txt size={13} color={colors.textMuted} numeric>
                  {weekChange >= 0 ? '+' : '-'}
                  {formatPrice(Math.abs(weekChange))} {strings.thisWeek}
                </Txt>
              </View>
            </View>
            <View style={{ marginTop: space.lg }}>
              <AreaChart
                key={featured.id}
                data={featured.sparkline}
                height={150}
                marker
                strokeWidth={2.2}
                color={colors.accentBright}
              />
            </View>
            <View style={{ paddingHorizontal: space.lg, marginTop: space.lg }}>
              <Segmented<Featured>
                size="sm"
                value={featuredId}
                onChange={setFeaturedId}
                options={[
                  { value: 'bitcoin', label: 'BTC' },
                  { value: 'ethereum', label: 'ETH' },
                  { value: 'solana', label: 'SOL' },
                ]}
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(motion.base)} style={styles.actions}>
            <Action icon={Plus} label={strings.newCall} onPress={() => router.push('/call/new')} />
            <Action icon={Flame} label={strings.trendingShort} onPress={() => router.push('/markets')} />
            <Action icon={Trophy} label={strings.ranking} onPress={() => router.push('/ranking')} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(motion.base)}>
            <PressableScale scaleTo={0.98} onPress={() => router.push('/profile')}>
              <Glass style={styles.promo}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Txt size={16} weight="semibold">
                    Callout Pro
                  </Txt>
                  <Txt size={13} color={colors.textMuted}>
                    {strings.premiumSubtitle}
                  </Txt>
                  <View style={styles.promoBtn}>
                    <Txt size={12} weight="semibold" color={colors.accentInk}>
                      {strings.comingSoon}
                    </Txt>
                  </View>
                </View>
                <View style={styles.promoArt}>
                  <View style={styles.orb} />
                  <ProLogo size={64} />
                </View>
              </Glass>
            </PressableScale>
          </Animated.View>

          {trending.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(200).duration(motion.base)}>
              <Glass style={styles.listCard}>
                <View style={styles.cardHeader}>
                  <SectionHeader
                    inset={false}
                    title={strings.trending}
                    action={strings.seeAll}
                    onAction={() => router.push('/markets')}
                  />
                </View>
                {trending.slice(0, 5).map((c, i) => (
                  <CoinRow
                    key={c.id}
                    {...c}
                    index={i}
                    subtitle={c.rank ? `${c.symbol} · #${c.rank}` : c.symbol}
                  />
                ))}
              </Glass>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(260).duration(motion.base)}>
            <Glass style={styles.listCard}>
              <View style={styles.cardHeader}>
                <SectionHeader
                  inset={false}
                  title={strings.topCoins}
                  action={strings.seeAll}
                  onAction={() => router.push('/markets')}
                />
                <Segmented<Filter>
                  size="sm"
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'top', label: 'Top' },
                    { value: 'gainers', label: strings.gainers },
                    { value: 'losers', label: strings.losers },
                    { value: 'momentum', label: strings.momentum },
                  ]}
                />
              </View>
              {list.map((c, i) => (
                <CoinRow key={`${filter}-${c.id}`} {...c} index={i} />
              ))}
            </Glass>
          </Animated.View>
        </>
      )}

      <Disclaimer />
    </Screen>
  );
}

function Action({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} style={styles.action}>
      <Icon size={17} color={colors.text} strokeWidth={2} />
      <Txt size={13} weight="medium">
        {label}
      </Txt>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.lg,
    marginTop: space.md,
  },
  hero: { marginTop: space.xl },
  heroChange: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 4 },
  actions: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, marginTop: space.lg },
  action: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: space.lg,
    marginTop: space.lg,
    padding: space.lg,
    gap: space.md,
  },
  promoBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  promoArt: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  orb: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accent,
    opacity: 0.18,
  },
  listCard: { marginHorizontal: space.lg, marginTop: space.lg, paddingBottom: space.sm },
  cardHeader: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xs, gap: space.sm },
});
