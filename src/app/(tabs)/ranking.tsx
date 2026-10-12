import { Crown, Medal } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Glass } from '@/components/glass';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { demoLeaderboard } from '@/lib/demo';
import { colors, motion, radius, space } from '@/theme';

const PODIUM = ['#FFD66B', '#C9CEDC', '#E3A574'];

export default function Ranking() {
  const [first, ...rest] = demoLeaderboard;
  return (
    <Screen>
      <Txt size={28} weight="semibold" style={{ paddingHorizontal: space.lg }}>
        {strings.ranking}
      </Txt>
      <View style={{ marginTop: space.lg }}>
        <SectionHeader title={strings.rankingSubtitle} badge={strings.demo} />
      </View>

      <Animated.View entering={FadeInDown.duration(motion.base)}>
        <Glass style={styles.hero}>
          <View style={styles.heroIcon}>
            <Crown size={26} color={PODIUM[0]} strokeWidth={1.9} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt size={18} weight="semibold">
              @{first.name}
            </Txt>
            <Txt size={13} color={colors.textMuted}>
              {first.calls} {strings.calls}
            </Txt>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt size={30} weight="semibold" color={colors.up} numeric>
              {first.accuracy}%
            </Txt>
            <Txt size={12} color={colors.textMuted}>
              {strings.accuracy}
            </Txt>
          </View>
        </Glass>
      </Animated.View>

      <Glass style={styles.list}>
        {rest.map((u, i) => (
          <Animated.View
            key={u.name}
            entering={FadeInDown.delay((i + 1) * motion.stagger).duration(motion.base)}
            style={styles.row}>
            <View style={styles.rank}>
              {i < 2 ? (
                <Medal size={18} color={PODIUM[i + 1]} strokeWidth={2} />
              ) : (
                <Txt size={14} weight="semibold" color={colors.textMuted} numeric>
                  {i + 2}
                </Txt>
              )}
            </View>
            <View style={styles.avatar}>
              <Txt size={15} weight="semibold">
                {u.name[0].toUpperCase()}
              </Txt>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt size={15} weight="semibold">
                @{u.name}
              </Txt>
              <Txt size={12} color={colors.textMuted}>
                {u.calls} {strings.calls}
              </Txt>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6, width: 72 }}>
              <Txt size={15} weight="semibold" numeric>
                {u.accuracy}%
              </Txt>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${u.accuracy}%` }]} />
              </View>
            </View>
          </Animated.View>
        ))}
      </Glass>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    marginHorizontal: space.lg,
    padding: space.xl,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 214, 107, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { marginHorizontal: space.lg, marginTop: space.lg, paddingVertical: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  rank: { width: 22, alignItems: 'center' },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTrack: { width: 72, height: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised },
  barFill: { height: 4, borderRadius: radius.pill, backgroundColor: colors.accent },
});
