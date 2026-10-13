import { router } from 'expo-router';
import { useState } from 'react';
import { BellRing, ChevronLeft, Gauge, ShieldCheck } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ProLogo } from '@/components/animated-logo';
import { Glass } from '@/components/glass';
import { IconButton } from '@/components/icon-button';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { billingAvailable, manageSubscription } from '@/lib/billing';
import { currentLocale } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { usePro } from '@/state/pro';
import { colors, motion, radius, space } from '@/theme';

const PERKS = [
  { icon: BellRing, text: () => strings.proPerk1 },
  { icon: Gauge, text: () => strings.proPerk2 },
  { icon: ShieldCheck, text: () => strings.proPerk3 },
];

export default function ProScreen() {
  const { pro, expiresAt, autoRenewing, plan, busy, failed, buy, restorePurchases } = usePro();
  const [note, setNote] = useState<string | null>(null);

  const date = expiresAt
    ? new Date(expiresAt).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const onBuy = async () => {
    haptic.tap();
    if ((await buy()) === 'unavailable') setNote(strings.proUnavailable);
  };
  const onRestore = async () => {
    const ok = await restorePurchases();
    setNote(ok ? strings.proRestored : strings.proNotFound);
  };

  return (
    <Screen
      withTabBar={false}
      header={
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
          <Txt size={17} weight="semibold">
            Callout Pro
          </Txt>
          <View style={{ width: 42 }} />
        </View>
      }>
      <Animated.View entering={FadeInDown.duration(motion.base)} style={styles.hero}>
        <ProLogo size={96} />
        <Txt size={22} weight="bold" style={{ textAlign: 'center' }}>
          {pro ? strings.proActive : strings.proHeadline}
        </Txt>
        {pro && date ? (
          <Txt size={14} color={colors.textMuted}>
            {(autoRenewing ? strings.proRenews : strings.proEnds).replace('{date}', date)}
          </Txt>
        ) : null}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(motion.base)}>
        <Glass style={styles.perks}>
          {PERKS.map(({ icon: Icon, text }, i) => (
            <View key={i} style={styles.perk}>
              <View style={styles.perkIcon}>
                <Icon size={18} color={colors.accent} />
              </View>
              <Txt size={15} style={{ flex: 1 }}>
                {text()}
              </Txt>
            </View>
          ))}
          <Txt size={12} color={colors.textMuted}>
            {strings.proPerksNote}
          </Txt>
        </Glass>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(140).duration(motion.base)} style={styles.actions}>
        {pro ? (
          billingAvailable ? (
            <PressableScale accessibilityRole="button" onPress={() => manageSubscription().catch(() => {})} style={styles.secondary}>
              <Txt size={15} weight="semibold">
                {strings.proManage}
              </Txt>
            </PressableScale>
          ) : null
        ) : (
          <>
            <PressableScale
              accessibilityRole="button"
              disabled={busy}
              onPress={onBuy}
              style={[styles.primary, busy && { opacity: 0.6 }]}>
              {busy ? (
                <ActivityIndicator color={colors.accentInk} />
              ) : (
                <Txt size={16} weight="bold" color={colors.accentInk}>
                  {plan ? `${strings.proSubscribe} · ${plan.price}` : billingAvailable ? strings.proPriceLoading : strings.proCta}
                </Txt>
              )}
            </PressableScale>
            {billingAvailable ? (
              <PressableScale accessibilityRole="button" disabled={busy} onPress={onRestore} style={styles.secondary}>
                <Txt size={14} weight="semibold">
                  {strings.proRestore}
                </Txt>
              </PressableScale>
            ) : null}
          </>
        )}
        {failed ? (
          <Txt size={13} color={colors.down} style={styles.center}>
            {strings.proFailed}
          </Txt>
        ) : null}
        {note ? (
          <Txt size={13} color={colors.textMuted} style={styles.center}>
            {note}
          </Txt>
        ) : null}
        <Txt size={12} color={colors.textMuted} style={styles.center}>
          {strings.proFinePrint}
        </Txt>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg },
  hero: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl, paddingHorizontal: space.lg },
  perks: { marginHorizontal: space.lg, padding: space.lg, gap: space.md },
  perk: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  perkIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.md },
  primary: {
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
});
