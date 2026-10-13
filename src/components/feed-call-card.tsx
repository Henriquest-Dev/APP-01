import { router } from 'expo-router';
import { Target, TrendingDown, TrendingUp } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { strings } from '@/i18n';
import type { FeedCall } from '@/lib/community';
import { formatAgo, formatPercent, formatPrice, formatTimeLeft } from '@/lib/format';
import { colors, radius, space } from '@/theme';
import { CoinAvatar } from './coin-avatar';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

type Props = {
  call: FeedCall;
  /** Current market price, to show how the call is doing while open. */
  livePrice?: number;
  /** Highlight briefly (arrived over Realtime). */
  fresh?: boolean;
  compact?: boolean;
  isMine?: boolean;
};

export function FeedCallCard({ call, livePrice, fresh, compact, isMine }: Props) {
  const up = call.direction === 'up';
  const Icon = up ? TrendingUp : TrendingDown;
  const tint = up ? colors.up : colors.down;
  const open = call.status === 'open';
  const now = open ? livePrice : call.exitPrice;
  const move = now ? ((now - call.entryPrice) / call.entryPrice) * 100 : undefined;
  const ago = formatAgo(call.createdAt);

  const glow = useSharedValue(fresh ? 1 : 0);
  useEffect(() => {
    if (fresh) glow.value = withTiming(0, { duration: 2400 });
  }, [fresh, glow]);
  const glowStyle = useAnimatedStyle(() => ({
    borderColor: glow.value > 0.01 ? `rgba(139, 108, 255, ${0.25 + glow.value * 0.75})` : colors.border,
  }));

  const status = open
    ? `${strings.endsIn} ${formatTimeLeft(call.expiresAt)}`
    : call.status === 'hit'
      ? strings.statusHit
      : call.status === 'miss'
        ? strings.statusMiss
        : strings.statusVoid;
  const statusColor =
    call.status === 'hit' ? colors.up : call.status === 'miss' ? colors.down : colors.textMuted;

  return (
    <PressableScale
      scaleTo={0.98}
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/coin/[id]', params: { id: call.coinId } })}>
      <Animated.View
        style={[styles.card, isMine && styles.mine, glowStyle, compact && { padding: space.md }]}>
        <View style={styles.head}>
          <PressableScale
            scaleTo={0.96}
            onPress={() => router.push({ pathname: '/user/[id]', params: { id: call.userId } })}
            style={styles.author}>
            <View style={styles.user}>
              <Txt size={12} weight="bold">
                {call.username[0]?.toUpperCase() ?? '?'}
              </Txt>
            </View>
            <Txt size={13} weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
              @{call.username}
            </Txt>
          </PressableScale>
          <Txt size={12} color={colors.textFaint}>
            · {ago || strings.justNow}
          </Txt>
          <View style={{ flex: 1 }} />
          <Txt size={11} weight="semibold" color={statusColor}>
            {status}
          </Txt>
        </View>

        <View style={styles.body}>
          <CoinAvatar uri={call.image} symbol={call.symbol} size={34} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt size={15} weight="semibold" numberOfLines={1}>
              {call.symbol}{' '}
              <Txt size={13} color={colors.textMuted}>
                {call.name}
              </Txt>
            </Txt>
            <Txt size={12} color={colors.textMuted} numeric>
              {strings.entry} {formatPrice(call.entryPrice)}
            </Txt>
          </View>
          <View style={[styles.direction, { backgroundColor: up ? colors.upSoft : colors.downSoft }]}>
            <Icon size={15} color={tint} strokeWidth={2.4} />
            <Txt size={12} weight="bold" color={tint}>
              {call.timeframe}
            </Txt>
          </View>
        </View>

        {call.targetPrice || move !== undefined ? (
          <View style={styles.meta}>
            {call.targetPrice ? (
              <View style={styles.metaItem}>
                <Target size={13} color={colors.textMuted} strokeWidth={2} />
                <Txt size={12} color={colors.textMuted} numeric>
                  {strings.target} {formatPrice(call.targetPrice)}
                </Txt>
              </View>
            ) : (
              <View />
            )}
            {move !== undefined ? (
              <Txt
                size={12}
                weight="semibold"
                color={(up ? move >= 0 : move <= 0) ? colors.up : colors.down}
                numeric>
                {formatPercent(move)}
              </Txt>
            ) : null}
          </View>
        ) : null}

        {call.note && !compact ? (
          <View style={styles.note}>
            <Txt size={13} color={colors.text} style={{ lineHeight: 19 }}>
              “{call.note}”
            </Txt>
          </View>
        ) : null}
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  author: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  card: {
    padding: space.lg,
    gap: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mine: { backgroundColor: colors.accentSoft },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  user: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  direction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  note: {
    padding: space.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
});
