import { useEffect, useRef, useState, type ComponentType } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Background } from '@/components/background';
import { CallsArt, CommunityArt, MomentumArt, RankingArt } from '@/components/onboarding-art';
import { PressableScale } from '@/components/pressable-scale';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { useSession } from '@/state/session';
import { colors, motion, radius, space } from '@/theme';

const SLIDES: { Art: ComponentType; title: string; text: string }[] = [
  { Art: CallsArt, title: strings.onb1Title, text: strings.onb1Text },
  { Art: CommunityArt, title: strings.onb2Title, text: strings.onb2Text },
  { Art: MomentumArt, title: strings.onb3Title, text: strings.onb3Text },
  { Art: RankingArt, title: strings.onb4Title, text: strings.onb4Text },
];

const AUTO_ADVANCE_MS = 4500;

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useSession();
  const scroller = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const last = index === SLIDES.length - 1;

  const goTo = (i: number) => {
    scroller.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  };

  // Auto-play until the person swipes or taps; then they're in control.
  useEffect(() => {
    if (touched || last) return;
    const timer = setTimeout(() => goTo(index + 1), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, touched, last]);

  const slide = SLIDES[index];

  return (
    <View style={styles.root}>
      <Background />

      <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <View style={{ width: 72 }} />
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Dot key={i} active={i === index} />
          ))}
        </View>
        <PressableScale onPress={completeOnboarding} style={styles.login} accessibilityRole="button">
          <Txt size={13} weight="semibold" color={colors.accentBright}>
            {strings.onbLogin}
          </Txt>
        </PressableScale>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => setTouched(true)}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1 }}>
        {SLIDES.map(({ Art }, i) => (
          <View key={i} style={[styles.page, { width }]}>
            {/* Mount the art only while visible so its entrance replays each time. */}
            {i === index ? <Art /> : null}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.lg }]}>
        <Animated.View
          key={index}
          entering={FadeInDown.duration(motion.base)}
          exiting={FadeOut.duration(120)}
          style={styles.copy}>
          <Txt size={32} weight="display" style={styles.title}>
            {slide.title}
          </Txt>
          <Txt size={15} color={colors.textMuted} style={styles.text}>
            {slide.text}
          </Txt>
        </Animated.View>

        <PressableScale
          accessibilityRole="button"
          onPress={() => {
            setTouched(true);
            if (last) completeOnboarding();
            else goTo(index + 1);
          }}
          style={styles.cta}>
          <Animated.View key={last ? 'start' : 'next'} entering={FadeIn.duration(motion.fast)}>
            <Txt size={16} weight="semibold" color={colors.accentInk}>
              {last ? strings.onbStart : strings.onbNext}
            </Txt>
          </Animated.View>
        </PressableScale>

        <Txt size={11} color={colors.textFaint} style={styles.terms}>
          {strings.terms}
        </Txt>
      </View>
    </View>
  );
}

function Dot({ active }: { active: boolean }) {
  const style = useAnimatedStyle(() => ({
    width: withSpring(active ? 22 : 6, motion.spring),
    backgroundColor: active ? colors.accent : colors.borderStrong,
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
  },
  dots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { height: 6, borderRadius: 3 },
  login: {
    width: 72,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: { flex: 1, justifyContent: 'center' },
  bottom: { paddingHorizontal: space.xl },
  copy: {
    alignItems: 'center',
    gap: space.md,
    marginBottom: space.xl,
    minHeight: 150,
    justifyContent: 'flex-end',
  },
  title: { textAlign: 'center', lineHeight: 40, letterSpacing: -0.5 },
  text: { textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  cta: {
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  terms: { textAlign: 'center', marginTop: space.lg, lineHeight: 16 },
});
