import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, UserCheck, UserPlus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Badges } from '@/components/badges';
import { FeedCallCard } from '@/components/feed-call-card';
import { Glass } from '@/components/glass';
import { IconButton } from '@/components/icon-button';
import { PostList } from '@/components/post-list';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { Txt } from '@/components/text';
import { useCallFeed } from '@/hooks/use-call-feed';
import { strings } from '@/i18n';
import { badgesFor } from '@/lib/badges';
import { formatCount } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { fetchCard, isFollowing, setFollow, type ProfileCard } from '@/lib/social';
import { useBlocks } from '@/state/blocks';
import { useMarket } from '@/state/market';
import { useSession } from '@/state/session';
import { colors, motion, radius, space } from '@/theme';

type Tab = 'calls' | 'posts';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const { coins } = useMarket();
  const { isBlocked } = useBlocks();
  const [card, setCard] = useState<ProfileCard | null | undefined>(undefined);
  const [follows, setFollows] = useState<boolean | null>(null);
  const [delta, setDelta] = useState(0);
  const [tab, setTab] = useState<Tab>('calls');
  const [notice, setNotice] = useState<string | null>(null);
  const mine = user?.id === id;
  const { calls } = useCallFeed({ userId: id, limit: 40 });

  useEffect(() => {
    let alive = true;
    fetchCard(id).then((c) => alive && setCard(c));
    if (user && user.id !== id) isFollowing(user.id, id).then((f) => alive && setFollows(f));
    return () => {
      alive = false;
    };
  }, [id, user]);

  const toggleFollow = async () => {
    if (!user) return setNotice(strings.accountNeeded);
    if (follows === null) return;
    const next = !follows;
    haptic.tap();
    setFollows(next);
    setDelta((d) => d + (next ? 1 : -1));
    try {
      await setFollow(user.id, id, next);
    } catch {
      setFollows(!next);
      setDelta((d) => d + (next ? -1 : 1));
      setNotice(strings.callFailed);
    }
  };

  const header = (
    <View style={styles.header}>
      <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
      <Txt size={17} weight="semibold" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
        {card ? `@${card.handle}` : ''}
      </Txt>
      <View style={{ width: 42 }} />
    </View>
  );

  if (card === undefined)
    return (
      <Screen withTabBar={false} header={header}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} />
      </Screen>
    );
  if (card === null || isBlocked(id))
    return (
      <Screen withTabBar={false} header={header}>
        <Txt color={colors.textMuted} style={{ textAlign: 'center', marginTop: space.xxl }}>
          {strings.userNotFound}
        </Txt>
      </Screen>
    );

  const accuracy = card.callsResolved ? Math.round((100 * card.callsHits) / card.callsResolved) : null;
  const badges = badgesFor(card);

  return (
    <Screen withTabBar={false} header={header}>
      <Animated.View entering={FadeInDown.duration(motion.base)}>
        <Glass style={styles.card}>
          <View style={styles.top}>
            <View style={styles.avatar}>
              <Txt size={26} weight="bold" color={colors.accentInk}>
                {card.username[0]?.toUpperCase() ?? '?'}
              </Txt>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt size={19} weight="semibold" numberOfLines={1}>
                {card.username}
              </Txt>
              <Txt size={13} color={colors.textMuted}>
                @{card.handle}
              </Txt>
            </View>
            {!mine ? (
              <PressableScale
                accessibilityRole="button"
                onPress={toggleFollow}
                style={[styles.followBtn, follows && styles.followingBtn]}>
                {follows ? (
                  <UserCheck size={16} color={colors.text} strokeWidth={2.2} />
                ) : (
                  <UserPlus size={16} color={colors.accentInk} strokeWidth={2.2} />
                )}
                <Txt size={13} weight="semibold" color={follows ? colors.text : colors.accentInk}>
                  {follows ? strings.following : strings.follow}
                </Txt>
              </PressableScale>
            ) : null}
          </View>

          {card.bio ? <Txt size={14}>{card.bio}</Txt> : null}

          <View style={styles.counts}>
            <Count value={card.followers + delta} label={strings.followers} />
            <Count value={card.following} label={strings.followingLabel} />
            <Count value={card.callsTotal} label={strings.callsMade} />
            <Count value={accuracy} label={strings.hitRate} suffix="%" />
          </View>

          <Badges badges={badges} />
          {notice ? (
            <Txt size={12} color={colors.down}>
              {notice}
            </Txt>
          ) : null}
        </Glass>
      </Animated.View>

      <View style={{ paddingHorizontal: space.lg, marginTop: space.lg }}>
        <Segmented<Tab>
          size="sm"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'calls', label: strings.callsTab },
            { value: 'posts', label: strings.posts },
          ]}
        />
      </View>

      {tab === 'calls' ? (
        calls === null ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: space.xl }} />
        ) : calls.length === 0 ? (
          <Txt size={14} color={colors.textMuted} style={styles.empty}>
            {strings.nothingYet}
          </Txt>
        ) : (
          <View style={styles.list}>
            {calls.map((c) => (
              <FeedCallCard
                key={c.id}
                call={c}
                livePrice={coins.find((x) => x.id === c.coinId)?.price}
                isMine={mine}
              />
            ))}
          </View>
        )
      ) : (
        <PostList authorId={id} onNotice={setNotice} />
      )}
    </Screen>
  );
}

function Count({ value, label, suffix = '' }: { value: number | null; label: string; suffix?: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1, gap: 2 }}>
      <Txt size={17} weight="bold" numeric>
        {value === null ? '—' : `${formatCount(value)}${suffix}`}
      </Txt>
      <Txt size={11} color={colors.textMuted} numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, gap: space.sm },
  card: { marginHorizontal: space.lg, padding: space.lg, gap: space.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  followingBtn: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  counts: { flexDirection: 'row', paddingVertical: space.xs },
  list: { paddingHorizontal: space.lg, marginTop: space.lg, gap: space.md },
  empty: { textAlign: 'center', marginTop: space.xl },
});
