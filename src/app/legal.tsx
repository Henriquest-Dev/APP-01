import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Glass } from '@/components/glass';
import { IconButton } from '@/components/icon-button';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { legalDoc, type LegalDoc } from '@/lib/legal';
import { colors, motion, radius, space } from '@/theme';

export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc: LegalDoc }>();
  const d = legalDoc(doc === 'privacy' || doc === 'risk' ? doc : 'terms');
  return (
    <Screen
      withTabBar={false}
      header={
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
          <Txt size={17} weight="semibold" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
            {d.title}
          </Txt>
          <View style={{ width: 42 }} />
        </View>
      }>
      <Txt size={12} color={colors.textFaint} style={styles.updated}>
        {d.updated}
      </Txt>
      {d.sections.map((s, i) => (
        <Animated.View key={s.h} entering={FadeInDown.delay(i * 40).duration(motion.base)}>
          <Glass style={styles.card}>
            <Txt size={15} weight="semibold">
              {s.h}
            </Txt>
            <Txt size={14} color={colors.textMuted} style={{ lineHeight: 21 }}>
              {s.p}
            </Txt>
          </Glass>
        </Animated.View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  updated: { paddingHorizontal: space.xl, marginTop: space.sm, marginBottom: space.sm },
  card: {
    marginHorizontal: space.lg,
    marginTop: space.md,
    padding: space.lg,
    gap: 6,
    borderRadius: radius.md,
  },
});
