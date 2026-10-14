import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

type Props = { icon: LucideIcon; onPress?: () => void; label: string; size?: number; badge?: number };

export function IconButton({ icon: Icon, onPress, label, size = 42, badge = 0 }: Props) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      scaleTo={0.9}
      style={[styles.btn, { width: size, height: size, borderRadius: size / 2 }]}>
      <Icon size={19} color={colors.text} strokeWidth={1.8} />
      {badge > 0 ? (
        <View style={styles.badge}>
          <Txt size={10} weight="bold" color="#FFFFFF">
            {badge > 9 ? '9+' : String(badge)}
          </Txt>
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.down,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
