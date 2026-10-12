import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/** Gently bobs its children up and down forever (idle "alive" motion). */
export function Float({
  children,
  amplitude = 6,
  duration = 2400,
  delay = 0,
  rotate = 0,
  style,
}: {
  children: ReactNode;
  amplitude?: number;
  duration?: number;
  delay?: number;
  rotate?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
  }, [p, delay, duration]);
  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateY: (p.value - 0.5) * 2 * amplitude },
      { rotate: `${(p.value - 0.5) * 2 * rotate}deg` },
    ],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
