import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { formatPercent } from '@/lib/format';
import { colors, radius } from '@/theme';
import { Txt } from './text';

export function ChangePill({ value, solid = false }: { value: number; solid?: boolean }) {
  const up = value >= 0;
  const fg = solid ? colors.accentInk : up ? colors.up : colors.down;
  const bg = solid ? (up ? colors.up : colors.down) : up ? colors.accentSoft : colors.downSoft;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={12} color={fg} />
      <Txt size={13} weight="semibold" color={fg}>
        {formatPercent(value)}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
});
