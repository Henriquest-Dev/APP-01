import type { LucideIcon } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/theme';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

export type SheetAction = { label: string; icon: LucideIcon; onPress: () => void; destructive?: boolean };

/** Bottom sheet with a list of actions (report, block, delete…). */
export function ActionSheet({
  visible,
  title,
  actions,
  onClose,
}: {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.md }]}>
        <View style={styles.grabber} />
        {title ? (
          <Txt size={13} weight="semibold" color={colors.textMuted} style={styles.title}>
            {title}
          </Txt>
        ) : null}
        {actions.map((a) => {
          const color = a.destructive ? colors.down : colors.text;
          return (
            <PressableScale
              key={a.label}
              scaleTo={0.98}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                a.onPress();
              }}
              style={styles.row}>
              <a.icon size={19} color={color} strokeWidth={2} />
              <Txt size={15} weight="medium" color={color}>
                {a.label}
              </Txt>
            </PressableScale>
          );
        })}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: colors.surfaceSolid,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: space.sm,
  },
  title: { paddingHorizontal: space.xl, paddingVertical: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingVertical: 16,
  },
});
