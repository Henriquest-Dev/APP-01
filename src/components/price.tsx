import { useEffect, useRef } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { splitPrice } from '@/lib/format';
import { colors } from '@/theme';
import { Txt } from './text';

/** Big price with dimmed decimals; flashes mint/rose when a live update moves it. */
export function Price({ value, size = 36 }: { value: number; size?: number }) {
  const [whole, decimals] = splitPrice(value);
  const previous = useRef(value);
  const flash = useSharedValue(0); // -1 down, 1 up

  useEffect(() => {
    if (value !== previous.current) {
      flash.value = withSequence(
        withTiming(value > previous.current ? 1 : -1, { duration: 120 }),
        withTiming(0, { duration: 700 }),
      );
      previous.current = value;
    }
  }, [value, flash]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - Math.abs(flash.value) * 0.25,
    transform: [{ translateY: -flash.value * 2 }],
  }));

  return (
    <Animated.View style={style}>
      <Txt size={size} weight="semibold" numeric numberOfLines={1} adjustsFontSizeToFit>
        {whole}
        <Txt size={size} weight="semibold" color={colors.textFaint} numeric>
          {decimals}
        </Txt>
      </Txt>
    </Animated.View>
  );
}
