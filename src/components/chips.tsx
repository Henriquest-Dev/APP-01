import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { colors, radius, space } from '@/theme';
import { Txt } from './text';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  scroll?: boolean;
};

export function Chips<T extends string>({ options, value, onChange, scroll = true }: Props<T>) {
  const items = options.map((o) => {
    const active = o.value === value;
    return (
      <Pressable
        key={o.value}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={() => onChange(o.value)}
        style={[styles.chip, active && styles.active, !scroll && { flex: 1 }]}>
        <Txt
          size={14}
          weight={active ? 'semibold' : 'medium'}
          color={active ? colors.accentInk : colors.textMuted}>
          {o.label}
        </Txt>
      </Pressable>
    );
  });

  if (!scroll) return <>{items}</>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm, paddingHorizontal: space.lg },
  chip: {
    paddingHorizontal: 18,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { backgroundColor: colors.accent },
});
