import { Image } from 'expo-image';
import { Plus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import type { Sticker } from '@/lib/profile';
import { colors, radius, space } from '@/theme';
import { PressableScale } from './pressable-scale';

type Props = {
  stickers: Sticker[];
  onPress?: (s: Sticker) => void;
  onLongPress?: (s: Sticker) => void;
  /** Shows a "+" tile first (my own stickers). */
  onCreate?: () => void;
  columns?: number;
};

/** A grid of stickers on a soft tile (so transparent ones are visible on the dark theme). */
export function StickerGrid({ stickers, onPress, onLongPress, onCreate, columns = 4 }: Props) {
  const gap = space.sm;
  return (
    <View style={[styles.grid, { gap }]}>
      {onCreate ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Create sticker"
          onPress={onCreate}
          style={[styles.tile, styles.create, { width: `${100 / columns - 2.2}%` }]}>
          <Plus size={26} color={colors.accent} strokeWidth={2.2} />
        </PressableScale>
      ) : null}
      {stickers.map((s) => (
        <PressableScale
          key={s.id}
          scaleTo={0.94}
          onPress={() => onPress?.(s)}
          onLongPress={() => onLongPress?.(s)}
          style={[styles.tile, { width: `${100 / columns - 2.2}%` }]}>
          <Image source={{ uri: s.url }} style={styles.img} contentFit="contain" transition={150} />
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.lg },
  tile: {
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  create: { borderStyle: 'dashed', borderColor: colors.accent },
  img: { width: '86%', height: '86%' },
});
