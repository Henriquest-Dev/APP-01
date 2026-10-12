import { Pressable, StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme';
import { Txt } from './text';

export function SectionHeader({
  title,
  action,
  onAction,
  badge,
  inset = true,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  badge?: string;
  inset?: boolean;
}) {
  return (
    <View style={[styles.row, inset && { paddingHorizontal: space.lg }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Txt size={17} weight="semibold">
          {title}
        </Txt>
        {badge ? (
          <View style={styles.badge}>
            <Txt size={10} weight="semibold" color={colors.warn}>
              {badge}
            </Txt>
          </View>
        ) : null}
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Txt size={13} weight="medium" color={colors.accentBright}>
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  badge: {
    backgroundColor: 'rgba(255,181,71,0.14)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
