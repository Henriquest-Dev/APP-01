import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Check, ChevronLeft, Globe, Info, LogOut, UserRound, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AnimatedLogo } from '@/components/animated-logo';
import { Disclaimer } from '@/components/disclaimer';
import { Glass } from '@/components/glass';
import { IconButton } from '@/components/icon-button';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { LANGUAGES, strings } from '@/i18n';
import { useLanguage } from '@/state/language';
import { useSession } from '@/state/session';
import { colors, motion, radius, space } from '@/theme';

export default function Settings() {
  const { language, change } = useLanguage();
  const { user, signedIn, signOut } = useSession();

  return (
    <Screen
      withTabBar={false}
      header={
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
          <Txt size={17} weight="semibold">
            {strings.settings}
          </Txt>
          <View style={{ width: 42 }} />
        </View>
      }>
      <SectionTitle icon={Globe} title={strings.language} />
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

      {signedIn ? (
        <>
          <SectionTitle icon={UserRound} title={strings.account} />
          <Glass style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Txt size={15} weight="semibold">
                  {user?.name ?? strings.guestName}
                </Txt>
                {user ? (
                  <Txt size={13} color={colors.textMuted}>
                    {user.email}
                  </Txt>
                ) : null}
              </View>
            </View>
            <PressableScale
              accessibilityRole="button"
              onPress={signOut}
              scaleTo={0.98}
              style={[styles.row, styles.divider]}>
              <LogOut size={18} color={colors.down} strokeWidth={2} />
              <Txt size={15} weight="semibold" color={colors.down}>
                {strings.signOut}
              </Txt>
            </PressableScale>
          </Glass>
        </>
      ) : null}

      <SectionTitle icon={Info} title={strings.about} />
      <Glass style={[styles.card, styles.about]}>
        <AnimatedLogo size={44} />
        <View style={{ flex: 1 }}>
          <Txt size={15} weight="semibold">
            Callout
          </Txt>
          <Txt size={13} color={colors.textMuted}>
            {strings.version} {Constants.expoConfig?.version ?? '1.0.0'}
          </Txt>
        </View>
      </Glass>

      <Disclaimer />
    </Screen>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Icon size={15} color={colors.textMuted} strokeWidth={2} />
      <Txt size={13} weight="semibold" color={colors.textMuted}>
        {title.toUpperCase()}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.xl,
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  card: { marginHorizontal: space.lg, borderRadius: radius.md },
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
  about: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
});
