import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { demoLeaderboard } from '@/lib/demo';
import { colors, radius, space } from '@/theme';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Ranking() {
  const [first, ...rest] = demoLeaderboard;
  return (
    <Screen>
      <Txt size={30} weight="semibold" style={{ paddingHorizontal: space.lg }}>
        {strings.ranking}
      </Txt>
      <SectionHeader title={strings.rankingSubtitle} badge={strings.demo} />

      <View style={styles.hero}>
        <Txt size={40}>🏆</Txt>
        <View style={{ flex: 1 }}>
          <Txt size={20} weight="semibold" color={colors.accentInk}>
            @{first.name}
          </Txt>
          <Txt size={14} color={colors.accentInk}>
            {first.calls} {strings.calls}
          </Txt>
        </View>
        <Txt size={34} weight="bold" color={colors.accentInk}>
          {first.accuracy}%
        </Txt>
      </View>

      {rest.map((u, i) => (
        <View key={u.name} style={styles.row}>
          <Txt size={16} weight="semibold" color={colors.textMuted} style={{ width: 30 }}>
            {MEDALS[i + 1] ?? i + 2}
          </Txt>
          <View style={styles.avatar}>
            <Txt size={16} weight="bold">
              {u.name[0].toUpperCase()}
            </Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt size={16} weight="semibold">
              @{u.name}
            </Txt>
            <Txt size={13} color={colors.textMuted}>
              {u.calls} {strings.calls}
            </Txt>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt size={18} weight="semibold" color={colors.accent}>
              {u.accuracy}%
            </Txt>
            <Txt size={12} color={colors.textMuted}>
              {strings.accuracy}
            </Txt>
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    marginHorizontal: space.lg,
    marginBottom: space.md,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
