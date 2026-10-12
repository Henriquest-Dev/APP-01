import { StyleSheet, View } from 'react-native';

import { strings } from '@/i18n';
import { colors, radius, space } from '@/theme';
import { Txt } from './text';

export function ConsensusBar({ up, compact = false }: { up: number; compact?: boolean }) {
  const down = 100 - up;
  return (
    <View style={{ gap: compact ? 6 : space.sm }}>
      <View style={styles.labels}>
        <Txt size={compact ? 12 : 14} weight="semibold" color={colors.up}>
          {strings.bullish} {up}%
        </Txt>
        <Txt size={compact ? 12 : 14} weight="semibold" color={colors.down}>
          {down}% {strings.bearish}
        </Txt>
      </View>
      <View style={[styles.track, { height: compact ? 6 : 10 }]}>
        <View style={{ flex: up, backgroundColor: colors.up, borderRadius: radius.pill }} />
        <View style={{ flex: down, backgroundColor: colors.down, borderRadius: radius.pill }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { flexDirection: 'row', gap: 3 },
});
