import { DeviceMotion } from 'expo-sensors';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

type Tilt = { x: SharedValue<number>; y: SharedValue<number>; sway: SharedValue<number> };

const TiltContext = createContext<Tilt | null>(null);

const MAX_TILT = 14; // degrees

/**
 * 2.5D stage: the scene sits in perspective and tilts with the phone
 * (DeviceMotion), with a slow idle sway so it's alive even when the phone is still.
 * Children wrapped in <Layer depth> shift by parallax according to their depth.
 */
export function TiltStage({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const sway = useSharedValue(0);

  useEffect(() => {
    sway.value = withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [sway]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let baseline: { beta: number; gamma: number } | null = null;
    let sub: { remove: () => void } | undefined;
    DeviceMotion.isAvailableAsync()
      .then((available) => {
        if (!available) return;
        DeviceMotion.setUpdateInterval(40);
        sub = DeviceMotion.addListener(({ rotation }) => {
          if (!rotation) return;
          baseline ??= { beta: rotation.beta, gamma: rotation.gamma };
          const toDeg = 180 / Math.PI;
          const tx = Math.max(-MAX_TILT, Math.min(MAX_TILT, (rotation.beta - baseline.beta) * toDeg * 0.6));
          const ty = Math.max(-MAX_TILT, Math.min(MAX_TILT, (rotation.gamma - baseline.gamma) * toDeg * 0.6));
          x.value = withSpring(-tx, { damping: 20, stiffness: 90 });
          y.value = withSpring(ty, { damping: 20, stiffness: 90 });
        });
      })
      .catch(() => {});
    return () => sub?.remove();
  }, [x, y]);

  const stage = useAnimatedStyle(() => {
    const idleX = (sway.value - 0.5) * 6;
    const idleY = (0.5 - sway.value) * 8;
    return {
      transform: [
        { perspective: 900 },
        { rotateX: `${x.value + idleX}deg` },
        { rotateY: `${y.value + idleY}deg` },
      ],
    };
  });

  return (
    <TiltContext.Provider value={{ x, y, sway }}>
      <Animated.View style={[style, stage]}>{children}</Animated.View>
    </TiltContext.Provider>
  );
}

/** Element floating at a depth inside a TiltStage (positive = closer to the viewer). */
export function Layer({
  depth,
  children,
  style,
}: {
  depth: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const tilt = useContext(TiltContext);
  const animated = useAnimatedStyle(() => {
    if (!tilt) return {};
    const ry = tilt.y.value + (0.5 - tilt.sway.value) * 8;
    const rx = tilt.x.value + (tilt.sway.value - 0.5) * 6;
    return {
      transform: [
        { translateX: ry * depth * 1.6 },
        { translateY: -rx * depth * 1.6 },
        { scale: 1 + depth * 0.04 },
      ],
    };
  });
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
