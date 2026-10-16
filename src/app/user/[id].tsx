import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedCallCard } from '@/components/feed-call-card';
import { IconButton } from '@/components/icon-button';
import { PostList } from '@/components/post-list';
import { ProfileHeader } from '@/components/profile-header';
import { Screen } from '@/components/screen';
import { StickerGrid } from '@/components/sticker-grid';
import { Txt } from '@/components/text';
import { UnderlineTabs } from '@/components/underline-tabs';
import { useCallFeed } from '@/hooks/use-call-feed';
import { useCoinPrices } from '@/hooks/use-coin-prices';
import { strings } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { fetchLabels, fetchStickers, type Label, type Sticker } from '@/lib/profile';
import { fetchCard, isFollowing, setFollow, type ProfileCard } from '@/lib/social';
import { useBlocks } from '@/state/blocks';
import { useSession } from '@/state/session';
import { colors, space } from '@/theme';
import { ChevronLeft } from 'lucide-react-native';

type Tab = 'calls' | 'posts' | 'stickers';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { isBlocked } = useBlocks();
  const [card, setCard] = useState<ProfileCard | null | undefined>(undefined);
  const [labels, setLabels] = useState<Label[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [follows, setFollows] = useState<boolean | null>(null);
  const [delta, setDelta] = useState(0);
  const [tab, setTab] = useState<Tab>('calls');
  const [notice, setNotice] = useState<string | null>(null);
  const mine = user?.id === id;
  const { calls } = useCallFeed({ userId: id, limit: 40 });
  const livePrices = useCoinPrices((calls ?? []).map((c) => c.coinId));

  useEffect(() => {
    let alive = true;
    fetchCard(id).then((c) => alive && setCard(c));
    fetchLabels(id).then((l) => alive && setLabels(l));
    fetchStickers(id).then((s) => alive && setStickers(s));
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

  const back = (
    <View style={[styles.floatingBack, { top: insets.top + 6 }]}>
      <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} size={38} />
    </View>
  );

  if (card === undefined)
    return (
      <Screen withTabBar={false} contentContainerStyle={{ paddingTop: 0 }}>
        {back}
        <ActivityIndicator color={colors.accent} style={{ marginTop: 160 }} />
      </Screen>
    );
  if (card === null || isBlocked(id))
    return (
      <Screen withTabBar={false} contentContainerStyle={{ paddingTop: 0 }}>
        {back}
        <Txt color={colors.textMuted} style={{ textAlign: 'center', marginTop: 160 }}>
          {strings.userNotFound}
        </Txt>
      </Screen>
    );

  return (
    <Screen withTabBar={false} contentContainerStyle={{ paddingTop: 0 }}>
      <ProfileHeader
        card={card}
        labels={labels}
        mine={mine}
        following={follows}
        followerDelta={delta}
        topInset={insets.top}
        onBack={() => router.back()}
        onEdit={() => router.push('/profile/edit')}
        onToggleFollow={toggleFollow}
      />
      {notice ? (
        <Txt size={12} color={colors.down} style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
          {notice}
        </Txt>
      ) : null}

      <UnderlineTabs<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'calls', label: strings.callsTab },
          { value: 'posts', label: strings.posts },
          { value: 'stickers', label: strings.stickersTitle },
        ]}
      />

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
              <FeedCallCard key={c.id} call={c} livePrice={livePrices[c.coinId]} isMine={mine} />
            ))}
          </View>
        )
      ) : tab === 'posts' ? (
        <PostList authorId={id} onNotice={setNotice} />
      ) : stickers.length === 0 ? (
        <Txt size={14} color={colors.textMuted} style={styles.empty}>
          {strings.noStickers}
        </Txt>
      ) : (
        <View style={{ marginTop: space.lg }}>
          <StickerGrid stickers={stickers} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  floatingBack: { position: 'absolute', left: space.lg, zIndex: 10 },
  list: { paddingHorizontal: space.lg, marginTop: space.lg, gap: space.md },
  empty: { textAlign: 'center', marginTop: space.xl },
});
