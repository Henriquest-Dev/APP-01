import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { strings } from '@/i18n';
import { colors, radius, space } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, [IconName, IconName]> = {
  index: ['home', 'home-outline'],
  markets: ['stats-chart', 'stats-chart-outline'],
  ranking: ['trophy', 'trophy-outline'],
  profile: ['person', 'person-outline'],
};

/** Floating pill tab bar with the "new call" action in the middle. */
export function TabBar({ state, navigation, descriptors, insets }: BottomTabBarProps) {
  const tabs = state.routes.map((route, index) => {
    const focused = state.index === index;
    const [on, off] = ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
    const label = descriptors[route.key].options.title ?? route.name;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={{ selected: focused }}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        }}
        style={[styles.tab, focused && styles.tabActive]}>
        <Ionicons name={focused ? on : off} size={21} color={focused ? colors.text : colors.textMuted} />
      </Pressable>
    );
  });

  const center = (
    <Pressable
      key="new-call"
      accessibilityRole="button"
      accessibilityLabel={strings.newCall}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/call/new');
      }}
      style={({ pressed }) => [styles.center, pressed && { transform: [{ scale: 0.94 }] }]}>
      <Ionicons name="megaphone" size={24} color={colors.accentInk} />
    </Pressable>
  );

  const half = Math.ceil(tabs.length / 2);
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, space.md) }]}>
      <View style={styles.bar}>
        {tabs.slice(0, half)}
        {center}
        {tabs.slice(half)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(19, 24, 21, 0.96)',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
  },
  tab: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.surfaceRaised },
  center: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
