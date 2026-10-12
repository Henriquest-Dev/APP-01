import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatPrice } from '@/lib/format';
import { colors, space } from '@/theme';
import { AreaChart } from './area-chart';
import { ChangePill } from './change-pill';
import { CoinAvatar } from './coin-avatar';
import { MomentumBadge } from './momentum-meter';
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
};

export function CoinRow({ id, symbol, name, image, price, change24h, sparkline, momentum, subtitle }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/coin/[id]', params: { id } })}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surface }]}>
      <CoinAvatar uri={image} symbol={symbol} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Txt size={16} weight="semibold">
            {symbol}
          </Txt>
          {momentum !== undefined ? <MomentumBadge score={momentum} /> : null}
        </View>
        <Txt size={13} color={colors.textMuted} numberOfLines={1}>
          {subtitle ?? name}
        </Txt>
      </View>
      {sparkline && sparkline.length > 1 ? (
        <View style={{ width: 64 }}>
          <AreaChart
            data={sparkline}
            height={30}
            strokeWidth={1.5}
            color={change24h >= 0 ? colors.up : colors.down}
          />
        </View>
      ) : null}
      <View style={{ alignItems: 'flex-end', gap: 4, minWidth: 92 }}>
        <Txt size={15} weight="semibold">
          {formatPrice(price)}
        </Txt>
        <ChangePill value={change24h} />
      </View>
    </Pressable>
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
