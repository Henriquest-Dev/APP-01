import { Pressable, StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme';
import { Txt } from './text';

export function SectionHeader({
  title,
  action,
  onAction,
  badge,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  badge?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Txt size={19} weight="semibold">
          {title}
        </Txt>
        {badge ? (
          <View style={styles.badge}>
            <Txt size={10} weight="bold" color={colors.warn}>
              {badge}
            </Txt>
          </View>
        ) : null}
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Txt size={14} weight="medium" color={colors.textMuted}>
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
    paddingHorizontal: space.lg,
    marginTop: space.xl,
    marginBottom: space.md,
  },
  badge: {
    borderWidth: 1,
    borderColor: colors.warn,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
});
