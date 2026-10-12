import { router } from 'expo-router';
import { Globe, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Background } from '@/components/background';
import { AppleIcon, GoogleIcon } from '@/components/brand-icons';
import { FlowField } from '@/components/flow-field';
import { AnimatedLogo } from '@/components/animated-logo';
import { IconButton } from '@/components/icon-button';
import { PressableScale } from '@/components/pressable-scale';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { useSession } from '@/state/session';
import { colors, motion, radius, space } from '@/theme';

export default function Welcome() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { continueAsGuest } = useSession();
  const [notice, setNotice] = useState(false);
  const fieldSize = Math.min(width * 0.82, height * 0.4);

  const social = () => {
    setNotice(true);
    setTimeout(() => setNotice(false), 3500);
  };

  return (
    <View
      style={[styles.root, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.lg }]}>
      <Background />

      <Animated.View entering={FadeIn.duration(motion.base)} style={styles.logo}>
        <View style={{ width: 42 }} />
        <AnimatedLogo size={56} />
        <IconButton icon={Globe} label={strings.language} onPress={() => router.push('/settings')} />
      </Animated.View>

      <Animated.View entering={FadeIn.duration(1200)} style={styles.field}>
        <FlowField size={fieldSize} />
      </Animated.View>

      <View style={styles.bottom}>
        <Animated.View entering={FadeInDown.delay(150).duration(motion.base)} style={styles.copy}>
          <Txt size={36} weight="display" style={{ textAlign: 'center' }}>
            {strings.welcomeTitle}
          </Txt>
          <Txt size={15} color={colors.textMuted} style={{ textAlign: 'center' }}>
            {strings.welcomeText}
          </Txt>
        </Animated.View>

        {notice ? (
          <Animated.View
            entering={FadeInUp.duration(motion.fast)}
            exiting={FadeOut.duration(motion.fast)}
            style={styles.notice}>
            <Txt size={12} color={colors.text} style={{ textAlign: 'center' }}>
              {strings.socialSoon}
            </Txt>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(250).duration(motion.base)} style={{ gap: 10 }}>
          <PressableScale
            accessibilityRole="button"
            onPress={() => router.push('/auth')}
            style={[styles.btn, styles.primary]}>
            <Mail size={18} color={colors.bg} strokeWidth={2.2} />
            <Txt size={15} weight="semibold" color={colors.bg}>
              {strings.withEmail}
            </Txt>
          </PressableScale>
          <PressableScale accessibilityRole="button" onPress={social} style={[styles.btn, styles.secondary]}>
            <GoogleIcon />
            <Txt size={15} weight="semibold">
              {strings.withGoogle}
            </Txt>
          </PressableScale>
          {Platform.OS === 'ios' ? (
            <PressableScale
              accessibilityRole="button"
              onPress={social}
              style={[styles.btn, styles.secondary]}>
              <AppleIcon />
              <Txt size={15} weight="semibold">
                {strings.withApple}
              </Txt>
            </PressableScale>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeIn.delay(400).duration(motion.base)}>
          <PressableScale
            accessibilityRole="button"
            onPress={continueAsGuest}
            style={styles.guest}
            scaleTo={0.97}>
            <Txt size={14} weight="medium" color={colors.accentBright}>
              {strings.guest}
            </Txt>
          </PressableScale>
          <Txt size={11} color={colors.textFaint} style={styles.terms}>
            {strings.terms}
          </Txt>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.xl },
  logo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  field: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottom: { gap: space.lg },
  copy: { gap: space.sm, marginBottom: space.sm },
  notice: {
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: {
    height: 54,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: '#FFFFFF' },
  secondary: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  guest: { alignSelf: 'center', paddingVertical: space.sm, paddingHorizontal: space.lg },
  terms: { textAlign: 'center', marginTop: space.sm, lineHeight: 16 },
});
