import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { strings } from '@/i18n';
import { colors, motion, radius } from '@/theme';
import { Txt } from './text';

/** Up/down split of community calls; the bar grows in from the center. */
export function ConsensusBar({ up }: { up: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: motion.slow, easing: Easing.out(Easing.cubic) });
  }, [up, progress]);

  const upStyle = useAnimatedStyle(() => ({ width: `${up * progress.value}%` }));
  const downStyle = useAnimatedStyle(() => ({ width: `${(100 - up) * progress.value}%` }));

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.labels}>
        <Txt size={13} weight="medium" color={colors.textMuted}>
          {strings.bullish}{' '}
          <Txt size={13} weight="semibold" color={colors.up} numeric>
            {up}%
          </Txt>
        </Txt>
        <Txt size={13} weight="medium" color={colors.textMuted}>
          <Txt size={13} weight="semibold" color={colors.down} numeric>
            {100 - up}%
          </Txt>{' '}
          {strings.bearish}
        </Txt>
      </View>
      <View style={styles.track}>
        <View style={[styles.half, { flex: up, alignItems: 'flex-end' }]}>
          <Animated.View style={[styles.fill, { backgroundColor: colors.up }, upStyle]} />
        </View>
        <View style={[styles.half, { flex: 100 - up }]}>
          <Animated.View style={[styles.fill, { backgroundColor: colors.down }, downStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { flexDirection: 'row', gap: 4, height: 6 },
  half: { borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
