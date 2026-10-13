import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';

import { Glass } from '@/components/glass';
import { IconButton } from '@/components/icon-button';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { useBlocks } from '@/state/blocks';
import { colors, radius, space } from '@/theme';

export default function BlockedUsers() {
  const { blocked, unblock } = useBlocks();
  return (
    <Screen
      withTabBar={false}
      header={
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
          <Txt size={17} weight="semibold">
            {strings.blockedUsers}
          </Txt>
          <View style={{ width: 42 }} />
        </View>
      }>
      <Txt size={13} color={colors.textMuted} style={styles.hint}>
        {strings.blockedHint}
      </Txt>
      {blocked.length === 0 ? (
        <Glass style={styles.empty}>
          <Txt size={14} color={colors.textMuted} style={{ textAlign: 'center' }}>
            {strings.noBlocked}
          </Txt>
        </Glass>
      ) : (
        <Glass style={styles.card}>
          {blocked.map((b, i) => (
            <Animated.View
              key={b.id}
              layout={LinearTransition}
              exiting={FadeOut}
              style={[styles.row, i > 0 && styles.divider]}>
              <View style={styles.avatar}>
                <Txt size={14} weight="bold">
                  {b.username[0]?.toUpperCase() ?? '?'}
                </Txt>
              </View>
              <Txt size={15} weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
                @{b.username}
              </Txt>
              <PressableScale
                onPress={() => unblock(b.id).catch(() => {})}
                style={styles.unblock}
                scaleTo={0.94}>
                <Txt size={13} weight="semibold">
                  {strings.unblock}
                </Txt>
              </PressableScale>
            </Animated.View>
          ))}
        </Glass>
      )}
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
  hint: { paddingHorizontal: space.xl, marginTop: space.md, marginBottom: space.md, lineHeight: 19 },
  empty: { marginHorizontal: space.lg, padding: space.xl },
  card: { marginHorizontal: space.lg, borderRadius: radius.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unblock: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
});
