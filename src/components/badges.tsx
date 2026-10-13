import { StyleSheet, View } from 'react-native';

import type { Badge } from '@/lib/badges';
import { colors, radius } from '@/theme';
import { Txt } from './text';

export function Badges({ badges }: { badges: Badge[] }) {
  if (!badges.length) return null;
  return (
    <View style={styles.row}>
      {badges.map(({ key, label, icon: Icon }) => (
        <View key={key} style={styles.chip}>
          <Icon size={13} color={colors.accent} strokeWidth={2.2} />
          <Txt size={12} weight="semibold">
            {label}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
