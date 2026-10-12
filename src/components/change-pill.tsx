import { ArrowDownRight, ArrowUpRight } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { formatPercent } from '@/lib/format';
import { colors, radius } from '@/theme';
import { Txt } from './text';

/** "↗ 2.02%" in mint or rose; `plain` drops the background like the list rows in the reference. */
export function ChangePill({
  value,
  plain = false,
  size = 13,
}: {
  value: number;
  plain?: boolean;
  size?: number;
}) {
  const up = value >= 0;
  const color = up ? colors.up : colors.down;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <View
      style={[
        styles.pill,
        !plain && {
          backgroundColor: up ? colors.upSoft : colors.downSoft,
          paddingHorizontal: 8,
          paddingVertical: 3,
        },
      ]}>
      <Arrow size={size} color={color} strokeWidth={2.2} />
      <Txt size={size} weight="medium" color={color} numeric>
        {formatPercent(Math.abs(value)).replace('+', '')}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
});
