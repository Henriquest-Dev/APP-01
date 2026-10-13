import { haptic } from '@/lib/haptics';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { House, MessagesSquare, Plus, Trophy, UserRound, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { strings } from '@/i18n';
import { colors, motion, radius, space } from '@/theme';

const ICONS: Record<string, LucideIcon> = {
  index: House,
  community: MessagesSquare,
  ranking: Trophy,
  profile: UserRound,
};

const TAB = 50;

/** Floating glass tab bar; a highlight slides under the active tab, "new call" sits in the middle. */
export function TabBar({ state, navigation, descriptors, insets }: BottomTabBarProps) {
  const [xs, setXs] = useState<Record<number, number>>({});
  const activeX = xs[state.index];

  const highlight = useAnimatedStyle(() => ({
    opacity: activeX === undefined ? 0 : 1,
    transform: [{ translateX: activeX === undefined ? 0 : withSpring(activeX, motion.spring) }],
  }));

  // Markets stays reachable (search) but isn't a tab button.
  const tabs = state.routes.map((route, index) => {
    if (!ICONS[route.name]) return null;
    const focused = state.index === index;
    const Icon = ICONS[route.name];
    const label = descriptors[route.key].options.title ?? route.name;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: focused }}
        onLayout={(e) => {
          const x = e.nativeEvent.layout.x;
          setXs((prev) => (prev[index] === x ? prev : { ...prev, [index]: x }));
        }}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            haptic.tap();
            navigation.navigate(route.name);
          }
        }}
        style={styles.tab}>
        <Icon size={21} color={focused ? colors.text : colors.textFaint} strokeWidth={focused ? 2.1 : 1.8} />
      </Pressable>
    );
  });

  const center = (
    <Pressable
      key="new-call"
      accessibilityRole="button"
      accessibilityLabel={strings.newCall}
      onPress={() => {
        haptic.impact();
        router.push('/call/new');
      }}
      style={({ pressed }) => [styles.center, pressed && { transform: [{ scale: 0.92 }] }]}>
      <Plus size={24} color={colors.accentInk} strokeWidth={2.4} />
    </Pressable>
  );

  const visible = tabs.filter(Boolean);
  const half = Math.ceil(visible.length / 2);
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, space.md) }]}>
      <View style={styles.bar}>
        <Animated.View style={[styles.highlight, highlight]} />
        {visible.slice(0, half)}
        {center}
        {visible.slice(half)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.xl, right: space.xl },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(21, 23, 42, 0.94)',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 6,
  },
  highlight: {
    position: 'absolute',
    left: 0,
    top: 6,
    width: TAB,
    height: TAB,
    borderRadius: TAB / 2,
    backgroundColor: colors.surfaceRaised,
  },
  tab: { width: TAB, height: TAB, borderRadius: TAB / 2, alignItems: 'center', justifyContent: 'center' },
  center: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
