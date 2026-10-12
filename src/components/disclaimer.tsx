import { Info } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { strings } from '@/i18n';
import { colors, space } from '@/theme';
import { Txt } from './text';

export function Disclaimer() {
  return (
    <View style={styles.row}>
      <Info size={14} color={colors.textFaint} strokeWidth={1.8} style={{ marginTop: 2 }} />
      <Txt size={12} color={colors.textFaint} style={{ flex: 1 }}>
        {strings.disclaimer}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, marginTop: space.xl },
});
