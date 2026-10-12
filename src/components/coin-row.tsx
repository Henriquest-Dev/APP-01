import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { formatPrice } from '@/lib/format';
import { colors, motion, space } from '@/theme';
import { AreaChart } from './area-chart';
import { ChangePill } from './change-pill';
import { CoinAvatar } from './coin-avatar';
import { MomentumBadge } from './momentum-meter';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

type Props = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
  sparkline?: number[];
  momentum?: number;
  subtitle?: string;
  index?: number;
};

export function CoinRow({
  id,
  symbol,
  name,
  image,
  price,
  change24h,
  sparkline,
  momentum,
  subtitle,
  index = 0,
}: Props) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * motion.stagger).duration(motion.base)}>
      <PressableScale
        accessibilityRole="button"
        scaleTo={0.98}
        onPress={() => router.push({ pathname: '/coin/[id]', params: { id } })}
        style={styles.row}>
        <CoinAvatar uri={image} symbol={symbol} size={38} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Txt size={15} weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {name}
            </Txt>
            {momentum !== undefined ? <MomentumBadge score={momentum} /> : null}
          </View>
          <Txt size={12} color={colors.textMuted} numberOfLines={1}>
            {subtitle ?? symbol}
          </Txt>
        </View>
        {sparkline && sparkline.length > 1 ? (
          <View style={{ width: 56 }}>
            <AreaChart
              data={sparkline}
              height={26}
              strokeWidth={1.5}
              fill={false}
              delay={index * motion.stagger}
              color={change24h >= 0 ? colors.up : colors.down}
            />
          </View>
        ) : null}
        <View style={{ alignItems: 'flex-end', gap: 3, minWidth: 86 }}>
          <Txt size={15} weight="semibold" numeric>
            {formatPrice(price)}
          </Txt>
          <ChangePill value={change24h} plain size={12} />
        </View>
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
    paddingVertical: 11,
  },
});
