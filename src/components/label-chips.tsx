import { X } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { bannerColors } from '@/lib/banners';
import type { Label } from '@/lib/profile';
import { colors, radius } from '@/theme';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

/** The coloured tags people put on their own profile. With `onRemove`, each one gets an ×. */
export function LabelChips({ labels, onRemove }: { labels: Label[]; onRemove?: (l: Label) => void }) {
  if (!labels.length) return null;
  return (
    <View style={styles.row}>
      {labels.map((l) => {
        const tint = bannerColors(l.color)[0];
        return (
          <View key={l.id} style={[styles.chip, { backgroundColor: `${tint}26`, borderColor: `${tint}80` }]}>
            <View style={[styles.dot, { backgroundColor: tint }]} />
            <Txt size={12} weight="semibold">
              {l.label}
            </Txt>
            {onRemove ? (
              <PressableScale hitSlop={8} scaleTo={0.8} onPress={() => onRemove(l)}>
                <X size={13} color={colors.textMuted} strokeWidth={2.4} />
              </PressableScale>
            ) : null}
          </View>
        );
      })}
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
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
