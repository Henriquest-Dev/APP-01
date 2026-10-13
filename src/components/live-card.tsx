import { router } from 'expo-router';
import { Play } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { strings } from '@/i18n';
import { formatAgo } from '@/lib/format';
import { PROVIDER_NAMES, type Live } from '@/lib/lives';
import { colors, radius, space } from '@/theme';
import { Glass } from './glass';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

export function LiveBadge() {
  return (
    <View style={styles.badge}>
      <View style={styles.dot} />
      <Txt size={10} weight="bold" color="#FFFFFF" style={{ letterSpacing: 0.8 }}>
        {strings.liveBadge}
      </Txt>
    </View>
  );
}

export function LiveCard({ live }: { live: Live }) {
  const provider = PROVIDER_NAMES[live.provider];
  return (
    <PressableScale
      scaleTo={0.98}
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/live/[id]', params: { id: live.id } })}>
      <Glass style={styles.card}>
        <View style={styles.play}>
          <Play size={20} color={colors.accentInk} fill={colors.accentInk} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <LiveBadge />
            {provider ? (
              <Txt size={12} color={colors.textMuted}>
                {provider}
              </Txt>
            ) : null}
          </View>
          <Txt size={15} weight="semibold" numberOfLines={2}>
            {live.title}
          </Txt>
          <Txt size={12} color={colors.textMuted} numberOfLines={1}>
            @{live.handle} · {formatAgo(live.startedAt) || strings.justNow}
          </Txt>
        </View>
      </Glass>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  play: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.down,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
});
