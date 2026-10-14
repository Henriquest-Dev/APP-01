import { router } from 'expo-router';
import { Check, ChevronLeft, UserPlus, X as XIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Glass } from '@/components/glass';
import { IconButton } from '@/components/icon-button';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { formatAgo } from '@/lib/format';
import { fetchNotifications, type AppNotification } from '@/lib/notifications';
import { useNotifications } from '@/state/notifications';
import { colors, motion, radius, space } from '@/theme';

function describe(n: AppNotification): { title: string; body: string } {
  const symbol = n.data.symbol ?? '';
  const handle = n.data.handle ?? '';
  switch (n.kind) {
    case 'call_hit':
      return { title: strings.notifCallHitTitle.replace('{symbol}', symbol), body: strings.notifCallHitBody };
    case 'call_miss':
      return {
        title: strings.notifCallMissTitle.replace('{symbol}', symbol),
        body: strings.notifCallMissBody,
      };
    case 'follow':
      return { title: strings.notifFollowTitle, body: strings.notifFollowBody.replace('{handle}', handle) };
  }
}

export default function Notifications() {
  const { markRead } = useNotifications();
  const [items, setItems] = useState<AppNotification[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchNotifications().then((rows) => {
      if (!alive) return;
      setItems(rows);
      // Show what was unread for this visit, then clear the badge.
      markRead().catch(() => {});
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = (n: AppNotification) => {
    if (n.kind === 'follow' && n.data.follower_id)
      router.push({ pathname: '/user/[id]', params: { id: n.data.follower_id } });
    else if (n.data.coin_id) router.push({ pathname: '/coin/[id]', params: { id: n.data.coin_id } });
  };

  return (
    <Screen
      withTabBar={false}
      header={
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
          <Txt size={17} weight="semibold">
            {strings.notifications}
          </Txt>
          <View style={{ width: 42 }} />
        </View>
      }>
      {items === null ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} />
      ) : items.length === 0 ? (
        <Txt size={14} color={colors.textMuted} style={styles.empty}>
          {strings.notifEmpty}
        </Txt>
      ) : (
        <Glass style={styles.list}>
          {items.map((n, i) => {
            const { title, body } = describe(n);
            const Icon = n.kind === 'call_hit' ? Check : n.kind === 'call_miss' ? XIcon : UserPlus;
            const tint =
              n.kind === 'call_hit' ? colors.up : n.kind === 'call_miss' ? colors.down : colors.accent;
            return (
              <Animated.View
                key={n.id}
                entering={FadeInDown.delay(Math.min(i, 10) * motion.stagger).duration(motion.base)}>
                <PressableScale
                  scaleTo={0.98}
                  onPress={() => open(n)}
                  style={[styles.row, i > 0 && styles.divider]}>
                  <View style={[styles.icon, { backgroundColor: `${tint}22` }]}>
                    <Icon size={18} color={tint} strokeWidth={2.4} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt size={15} weight={n.read ? 'medium' : 'semibold'}>
                      {title}
                    </Txt>
                    <Txt size={13} color={colors.textMuted}>
                      {body}
                    </Txt>
                  </View>
                  <Txt size={12} color={colors.textFaint}>
                    {formatAgo(n.createdAt) || strings.justNow}
                  </Txt>
                </PressableScale>
              </Animated.View>
            );
          })}
        </Glass>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
  },
  empty: { textAlign: 'center', marginTop: space.xxl, paddingHorizontal: space.xl },
  list: { marginHorizontal: space.lg, marginTop: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  icon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
