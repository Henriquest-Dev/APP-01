import { StyleSheet, View } from 'react-native';

import { momentumLabel } from '@/lib/momentum';
import { colors, radius } from '@/theme';
import { Txt } from './text';

const SEGMENTS = 20;

export function momentumColor(score: number) {
  const label = momentumLabel(score);
  return label === 'high' ? colors.accent : label === 'low' ? colors.down : colors.warn;
}

/** Segmented gauge, echoing the volume bars in the reference design. */
export function MomentumMeter({ score }: { score: number }) {
  const lit = Math.round((score / 100) * SEGMENTS);
  const color = momentumColor(score);
  return (
    <View style={styles.row}>
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <View
          key={i}
          style={[
            styles.seg,
            { height: 10 + (i / SEGMENTS) * 22, backgroundColor: i < lit ? color : colors.border },
          ]}
        />
      ))}
    </View>
  );
}

export function MomentumBadge({ score }: { score: number }) {
  const color = momentumColor(score);
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Txt size={12} weight="bold" color={color}>
        {score}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 32 },
  seg: { flex: 1, borderRadius: 3 },
  badge: {
    minWidth: 34,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
  },
});
