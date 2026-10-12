import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { colors, motion, radius } from '@/theme';
import { Txt } from './text';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
};

/** Segmented control with a pill that slides to the selected option. */
export function Segmented<T extends string>({ options, value, onChange, size = 'md' }: Props<T>) {
  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const active = layouts[value];

  const pill = useAnimatedStyle(() => ({
    opacity: active ? 1 : 0,
    width: active ? withSpring(active.width, motion.spring) : 0,
    transform: [{ translateX: active ? withSpring(active.x, motion.spring) : 0 }],
  }));

  const onLayout = (key: string) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setLayouts((prev) =>
      prev[key]?.x === x && prev[key]?.width === width ? prev : { ...prev, [key]: { x, width } },
    );
  };

  const h = size === 'sm' ? 32 : 40;
  return (
    <View style={[styles.track, { height: h + 8 }]}>
      <Animated.View style={[styles.pill, { height: h }, pill]} />
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onLayout={onLayout(o.value)}
            onPress={() => onChange(o.value)}
            style={[styles.item, { height: h }]}>
            <Txt
              size={size === 'sm' ? 13 : 14}
              weight={selected ? 'semibold' : 'medium'}
              color={selected ? colors.text : colors.textMuted}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pill: {
    position: 'absolute',
    left: 0,
    top: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
});
