import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { momentumLabel } from '@/lib/momentum';
import { colors, radius } from '@/theme';
import { Txt } from './text';

const SEGMENTS = 24;

export function momentumColor(score: number) {
  const label = momentumLabel(score);
  return label === 'high' ? colors.up : label === 'low' ? colors.down : colors.warn;
}

/** Equalizer-style gauge; bars rise one after another. */
export function MomentumMeter({ score }: { score: number }) {
  const lit = Math.round((score / 100) * SEGMENTS);
  const color = momentumColor(score);
  return (
    <View style={styles.row}>
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <Bar
          key={`${score}-${i}`}
          index={i}
          height={8 + (i / SEGMENTS) * 26}
          color={i < lit ? color : colors.surfaceRaised}
        />
      ))}
    </View>
  );
}

function Bar({ index, height, color }: { index: number; height: number; color: string }) {
  const grow = useSharedValue(0);
  useEffect(() => {
    grow.value = withDelay(
      index * 22,
      withTiming(1, { duration: 420, easing: Easing.out(Easing.back(1.6)) }),
    );
  }, [grow, index]);
  const style = useAnimatedStyle(() => ({ height: height * grow.value }));
  return <Animated.View style={[styles.seg, { backgroundColor: color }, style]} />;
}

export function MomentumBadge({ score }: { score: number }) {
  const color = momentumColor(score);
  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Txt size={11} weight="semibold" color={color} numeric>
        {score}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 34 },
  seg: { flex: 1, borderRadius: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
