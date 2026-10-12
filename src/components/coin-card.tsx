import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { strings } from '@/i18n';
import { demoConsensus } from '@/lib/demo';
import type { Coin } from '@/lib/types';
import { colors, radius, space } from '@/theme';
import { AreaChart } from './area-chart';
import { ChangePill } from './change-pill';
import { CoinAvatar } from './coin-avatar';
import { ConsensusBar } from './consensus-bar';
import { Price } from './price';
import { Txt } from './text';

export const COIN_CARD_WIDTH = 270;

export function CoinCard({ coin }: { coin: Coin }) {
  const consensus = demoConsensus(coin.id);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/coin/[id]', params: { id: coin.id } })}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View style={styles.head}>
        <CoinAvatar uri={coin.image} symbol={coin.symbol} size={44} />
        <View style={{ flex: 1 }}>
          <Txt size={17} weight="semibold">
            {coin.symbol}
          </Txt>
          <Txt size={13} color={colors.textMuted} numberOfLines={1}>
            {coin.name}
          </Txt>
        </View>
        <ChangePill value={coin.change24h} />
      </View>

      <Txt size={14} color={colors.textMuted} style={{ marginTop: space.lg }}>
        {strings.price}
      </Txt>
      <Price value={coin.price} size={30} />

      <View style={{ marginHorizontal: -space.lg, marginTop: space.sm }}>
        <AreaChart
          data={coin.sparkline}
          height={86}
          marker
          color={coin.change24h >= 0 ? colors.up : colors.down}
        />
      </View>

      <View style={{ marginTop: space.md }}>
        <ConsensusBar up={consensus.up} compact />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: COIN_CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    overflow: 'hidden',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
