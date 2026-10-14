import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** X-style tabs: plain labels with an underline under the active one. */
export function UnderlineTabs<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.row}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <PressableScale
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            scaleTo={0.97}
            onPress={() => onChange(o.value)}
            style={styles.tab}>
            <Txt size={15} weight={active ? 'bold' : 'medium'} color={active ? colors.text : colors.textMuted}>
              {o.label}
            </Txt>
            <View style={[styles.bar, active && styles.barOn]} />
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, alignItems: 'center', paddingTop: 14, gap: 12 },
  bar: { height: 3, width: 44, borderRadius: 2, backgroundColor: 'transparent' },
  barOn: { backgroundColor: colors.accent },
});
