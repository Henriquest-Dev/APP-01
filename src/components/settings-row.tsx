import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

/** One row in a settings card: icon, label, optional value and chevron or custom control. */
export function SettingsRow({
  icon: Icon,
  label,
  value,
  onPress,
  right,
  destructive,
  first,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
  first?: boolean;
}) {
  const tint = destructive ? colors.down : colors.text;
  const content = (
    <>
      <View style={[styles.icon, destructive && { backgroundColor: colors.downSoft }]}>
        <Icon size={17} color={destructive ? colors.down : colors.accentBright} strokeWidth={2} />
      </View>
      <Txt size={15} color={tint} style={{ flex: 1 }} numberOfLines={1}>
        {label}
      </Txt>
      {value ? (
        <Txt size={14} color={colors.textMuted} numberOfLines={1} style={{ maxWidth: '45%' }}>
          {value}
        </Txt>
      ) : null}
      {right ?? (onPress ? <ChevronRight size={18} color={colors.textFaint} /> : null)}
    </>
  );
  return onPress ? (
    <PressableScale
      accessibilityRole="button"
      scaleTo={0.98}
      onPress={onPress}
      style={[styles.row, !first && styles.divider]}>
      {content}
    </PressableScale>
  ) : (
    <View style={[styles.row, !first && styles.divider]}>{content}</View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: 13,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
