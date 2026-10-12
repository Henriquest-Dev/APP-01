import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

export const COINS = {
  btc: { image: require('@/assets/coins/btc.png'), face: '#F7931A', edge: '#B4650A', fill: true },
  eth: { image: require('@/assets/coins/eth.png'), face: '#E9ECFF', edge: '#8A93C9', fill: false },
  sol: { image: require('@/assets/coins/sol.png'), face: '#141428', edge: '#4B3C8F', fill: false },
  bnb: { image: require('@/assets/coins/bnb.png'), face: '#F3BA2F', edge: '#A9790A', fill: true },
  xrp: { image: require('@/assets/coins/xrp.png'), face: '#FFFFFF', edge: '#9AA0B5', fill: true },
  doge: { image: require('@/assets/coins/doge.png'), face: '#C2A633', edge: '#7E6A1B', fill: true },
  ada: { image: require('@/assets/coins/ada.png'), face: '#FFFFFF', edge: '#2A5ADA', fill: false },
} as const;

export type CoinKey = keyof typeof COINS;

const EDGE_LAYERS = 4;

/**
 * 2.5D coin: a face that spins around its vertical axis with a visible rim,
 * built from a few stacked discs that slide apart as the coin turns.
 * Pass `spin` (radians) to drive it externally, or let it spin by itself.
 */
export function CoinToken({ coin, size, spin }: { coin: CoinKey; size: number; spin?: SharedValue<number> }) {
  const own = useSharedValue(0);
  const c = COINS[coin];

  useEffect(() => {
    if (spin) return;
    own.value = withRepeat(
      withSequence(
        withTiming(Math.PI * 2, { duration: 2600, easing: Easing.inOut(Easing.cubic) }),
        withTiming(Math.PI * 2, { duration: 1400 }),
      ),
      -1,
    );
  }, [own, spin]);

  const thickness = size * 0.09;

  const faceStyle = useAnimatedStyle(() => {
    const a = (spin ?? own).value;
    return { transform: [{ scaleX: Math.max(0.04, Math.abs(Math.cos(a))) }] };
  });

  return (
    <View style={{ width: size + thickness, height: size }}>
      {Array.from({ length: EDGE_LAYERS }, (_, i) => (
        <Edge key={i} index={i + 1} size={size} thickness={thickness} color={c.edge} spin={spin ?? own} />
      ))}
      <Animated.View
        style={[
          styles.disc,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: c.face },
          faceStyle,
        ]}>
        <Image
          source={c.image}
          style={
            c.fill
              ? { width: size, height: size, borderRadius: size / 2 }
              : { width: size * 0.62, height: size * 0.62 }
          }
          contentFit="contain"
        />
        <View style={[styles.shine, { width: size * 0.9, height: size * 0.45, borderRadius: size }]} />
      </Animated.View>
    </View>
  );
}

function Edge({
  index,
  size,
  thickness,
  color,
  spin,
}: {
  index: number;
  size: number;
  thickness: number;
  color: string;
  spin: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const a = spin.value;
    const offset = Math.sin(a) * (thickness / EDGE_LAYERS) * index;
    return {
      transform: [{ translateX: offset }, { scaleX: Math.max(0.04, Math.abs(Math.cos(a))) }],
    };
  });
  return (
    <Animated.View
      style={[
        styles.disc,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  disc: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shine: { position: 'absolute', top: '6%', backgroundColor: 'rgba(255,255,255,0.18)' },
});
