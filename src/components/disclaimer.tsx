import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { strings } from '@/i18n';
import { colors, space } from '@/theme';
import { Txt } from './text';

export function Disclaimer() {
  return (
    <View style={styles.row}>
      <Ionicons name="information-circle-outline" size={16} color={colors.textFaint} />
      <Txt size={12} color={colors.textFaint} style={{ flex: 1 }}>
        {strings.disclaimer}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, marginTop: space.xl },
});
