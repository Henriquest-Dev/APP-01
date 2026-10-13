import { router } from 'expo-router';
import { Check, ChevronLeft } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Glass } from '@/components/glass';
import { IconButton } from '@/components/icon-button';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { LANGUAGES, strings } from '@/i18n';
import { useLanguage } from '@/state/language';
import { colors, motion, radius, space } from '@/theme';

export default function LanguageSettings() {
  const { language, change } = useLanguage();
  return (
    <Screen
      withTabBar={false}
      header={
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
          <Txt size={17} weight="semibold">
            {strings.language}
          </Txt>
          <View style={{ width: 42 }} />
        </View>
      }>
      <Glass style={styles.card}>
        {LANGUAGES.map((l, i) => {
          const selected = l.code === language;
          return (
            <Animated.View key={l.code} entering={FadeInDown.delay(i * 25).duration(motion.base)}>
              <PressableScale
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                scaleTo={0.98}
                onPress={() => change(l.code)}
                style={[styles.row, i > 0 && styles.divider]}>
                <View style={[styles.code, selected && { backgroundColor: colors.accent }]}>
                  <Txt size={11} weight="bold" color={selected ? '#FFFFFF' : colors.textMuted}>
                    {l.code.toUpperCase()}
                  </Txt>
                </View>
                <Txt size={15} weight={selected ? 'semibold' : 'regular'} style={{ flex: 1 }}>
                  {l.name}
                </Txt>
                {selected ? <Check size={18} color={colors.accentBright} strokeWidth={2.4} /> : null}
              </PressableScale>
            </Animated.View>
          );
        })}
      </Glass>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  card: { marginHorizontal: space.lg, marginTop: space.md, borderRadius: radius.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  code: {
    width: 34,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
