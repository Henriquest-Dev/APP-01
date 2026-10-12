import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme';
import { PressableScale } from './pressable-scale';

type Props = { icon: LucideIcon; onPress?: () => void; label: string; size?: number };

export function IconButton({ icon: Icon, onPress, label, size = 42 }: Props) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      scaleTo={0.9}
      style={[styles.btn, { width: size, height: size, borderRadius: size / 2 }]}>
      <Icon size={19} color={colors.text} strokeWidth={1.8} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
