import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { strings } from '@/i18n';
import { colors, radius } from '@/theme';
import { Txt } from './text';

/** Pulsing "LIVE" badge for realtime surfaces. */
export function LiveDot() {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1);
  }, [pulse]);
  const ring = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 1.6 }],
  }));
  return (
    <View style={styles.badge}>
      <View style={styles.dotWrap}>
        <Animated.View style={[styles.dot, styles.ring, ring]} />
        <View style={styles.dot} />
      </View>
      <Txt size={10} weight="bold" color={colors.down} style={{ letterSpacing: 0.8 }}>
        {strings.live}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.downSoft,
  },
  dotWrap: { width: 8, height: 8, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.down },
  ring: { position: 'absolute' },
});
