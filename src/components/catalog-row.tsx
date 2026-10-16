import { router } from 'expo-router';
import { Flame, RotateCcw } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { strings } from '@/i18n';
import type { CatalogCoin } from '@/lib/catalog';
import { formatAgo, formatPrice } from '@/lib/format';
import { colors, motion, space } from '@/theme';
import { ChangePill } from './change-pill';
import { CoinAvatar } from './coin-avatar';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

type Props = { coin: CatalogCoin; price?: number; change24h?: number; index?: number };

/** A coin from the catalog: shows whether it is trending now, came back, or left the list. */
export function CatalogRow({ coin, price, change24h, index = 0 }: Props) {
  const neverTrended = coin.lastTrendingAt < Date.UTC(2000, 0, 1);
  const status = neverTrended
    ? strings.hasCalls
    : coin.returned
      ? strings.returnedTrending
      : coin.trendingNow
        ? strings.inTrending
        : strings.leftTrending.replace('{ago}', formatAgo(coin.lastTrendingAt) || '1m');
  const StatusIcon = coin.returned ? RotateCcw : coin.trendingNow ? Flame : null;
  const hot = coin.trendingNow;

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * motion.stagger).duration(motion.base)}>
      <PressableScale
        accessibilityRole="button"
        scaleTo={0.98}
        onPress={() => router.push({ pathname: '/coin/[id]', params: { id: coin.id } })}
        style={styles.row}>
        <CoinAvatar uri={coin.image} symbol={coin.symbol} size={38} />
        <View style={{ flex: 1, gap: 3 }}>
          <Txt size={15} weight="semibold" numberOfLines={1}>
            {coin.name}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {StatusIcon ? <StatusIcon size={12} color={colors.accent} strokeWidth={2.2} /> : null}
            <Txt size={12} color={hot ? colors.accent : colors.textMuted} numberOfLines={1}>
              {coin.symbol} · {status}
            </Txt>
          </View>
        </View>
        {price !== undefined ? (
          <View style={{ alignItems: 'flex-end', gap: 3, minWidth: 86 }}>
            <Txt size={15} weight="semibold" numeric>
              {formatPrice(price)}
            </Txt>
            {change24h !== undefined ? <ChangePill value={change24h} plain size={12} /> : null}
          </View>
        ) : null}
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
});
