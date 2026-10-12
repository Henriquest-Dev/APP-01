import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { motion } from '@/theme';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  /** How far the element shrinks while pressed. */
  scaleTo?: number;
};

// Props that position the element among its siblings stay on the Pressable;
// everything visual goes on the inner view that scales.
const OUTER_KEYS = [
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'margin',
  'marginHorizontal',
  'marginVertical',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'position',
  'top',
  'bottom',
  'left',
  'right',
] as const;

/** Pressable with a springy press-down, used for every tappable surface. */
export function PressableScale({ style, children, scaleTo = 0.96, onPressIn, onPressOut, ...rest }: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const flat: Record<string, unknown> = { ...(StyleSheet.flatten(style) ?? {}) };
  const outer: Record<string, unknown> = {};
  for (const key of OUTER_KEYS) {
    if (key in flat) {
      outer[key] = flat[key];
      delete flat[key];
    }
  }
  if (outer.flex !== undefined || outer.flexGrow !== undefined) flat.flexGrow = 1;

  return (
    <Pressable
      {...rest}
      style={outer as ViewStyle}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, motion.spring));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, motion.spring));
        onPressOut?.(e);
      }}>
      <Animated.View style={[flat as ViewStyle, animated]}>{children}</Animated.View>
    </Pressable>
  );
}
