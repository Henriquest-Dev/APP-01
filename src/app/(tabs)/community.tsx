import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, Globe, KeyRound, Lock, Plus, Search, Users } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeOut, LinearTransition } from 'react-native-reanimated';

import { FeedCallCard } from '@/components/feed-call-card';
import { IconButton } from '@/components/icon-button';
import { Glass } from '@/components/glass';
import { LiveDot } from '@/components/live-dot';
import { PostList } from '@/components/post-list';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { Txt } from '@/components/text';
import { useCallFeed } from '@/hooks/use-call-feed';
import { bannerColors } from '@/lib/banners';
import { strings } from '@/i18n';
import { fetchGroups, joinGroup, joinGroupByCode, type Group } from '@/lib/community';
import { formatAgo } from '@/lib/format';
import { useBlocks } from '@/state/blocks';
import { useMarket } from '@/state/market';
import { useSession } from '@/state/session';
import { colors, fonts, motion, radius, space } from '@/theme';

type Tab = 'feed' | 'posts' | 'groups';
type Scope = 'all' | 'mine';

export default function Community() {
  const [tab, setTab] = useState<Tab>('feed');
  const [notice, setNotice] = useState<string | null>(null);
  const showNotice = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 3000);
  };
  return (
    <Screen
      keyboardShouldPersistTaps="handled"
      footer={
        notice ? (
          <Animated.View
            entering={FadeInUp.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.toast}>
            <Txt size={13} color={colors.text} style={{ textAlign: 'center' }}>
              {notice}
            </Txt>
          </Animated.View>
        ) : null
      }>
      <View style={styles.title}>
        <Txt size={28} weight="semibold">
          {strings.community}
        </Txt>
        <LiveDot />
        <View style={{ flex: 1 }} />
        <IconButton icon={Search} label={strings.searchPeople} onPress={() => router.push('/search')} />
      </View>
      <View style={styles.pad}>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'feed', label: strings.callsTab },
            { value: 'posts', label: strings.posts },
            { value: 'groups', label: strings.groups },
          ]}
        />
      </View>
      {tab === 'feed' ? <Feed /> : tab === 'posts' ? <PostList onNotice={showNotice} /> : <Groups />}
    </Screen>
  );
}

function Feed() {
  const { user } = useSession();
  const { coins } = useMarket();
  const [scope, setScope] = useState<Scope>('all');
  const { isBlocked } = useBlocks();
  const { calls: rawCalls, freshIds } = useCallFeed({
    userId: scope === 'mine' ? user?.id : undefined,
    enabled: scope === 'all' || !!user,
  });
  const calls = rawCalls?.filter((c) => !isBlocked(c.userId)) ?? null;
  const priceOf = (coinId: string) => coins.find((c) => c.id === coinId)?.price;

  return (
    <View>
      <View style={[styles.pad, { marginTop: space.md }]}>
        <Segmented<Scope>
          size="sm"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'all', label: strings.community },
            { value: 'mine', label: strings.mine },
          ]}
        />
      </View>
      {scope === 'mine' && !user ? (
        <Empty text={strings.accountNeededText} />
      ) : calls === null ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} />
      ) : calls.length === 0 ? (
        <Empty text={strings.noFeed} />
      ) : (
        <View style={styles.list}>
          {calls.map((c, i) => (
            <Animated.View
              key={c.id}
              layout={LinearTransition.duration(motion.base)}
              entering={FadeInDown.delay(Math.min(i, 8) * motion.stagger).duration(motion.base)}>
              <FeedCallCard
                call={c}
                livePrice={priceOf(c.coinId)}
                fresh={freshIds.has(c.id)}
                isMine={c.userId === user?.id}
              />
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}

function Groups() {
  const { user } = useSession();
  const [data, setData] = useState<{ mine: Group[]; discover: Group[] } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setData(await fetchGroups(user?.id));
  }, [user?.id]);

  // Refresh whenever the tab comes back into view (e.g. after creating a group).
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      fetchGroups(user?.id).then((d) => alive && setData(d));
      return () => {
        alive = false;
      };
    }, [user?.id]),
  );

  const join = async (g: Group) => {
    if (!user) return setError(strings.accountNeeded);
    try {
      await joinGroup(g.id, user.id);
      router.push({ pathname: '/group/[id]', params: { id: g.id } });
      load();
    } catch {
      setError(strings.callFailed);
    }
  };

  const joinCode = async () => {
    if (!user) return setError(strings.accountNeeded);
    if (code.trim().length < 4 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const id = await joinGroupByCode(code);
      setCode('');
      router.push({ pathname: '/group/[id]', params: { id } });
      load();
    } catch {
      setError(strings.invalidCode);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <View style={styles.actions}>
        <PressableScale
          accessibilityRole="button"
          onPress={() => (user ? router.push('/group/new') : setError(strings.accountNeeded))}
          style={[styles.actionBtn, { backgroundColor: colors.accent }]}>
          <Plus size={18} color={colors.accentInk} strokeWidth={2.4} />
          <Txt size={14} weight="semibold" color={colors.accentInk}>
            {strings.createGroup}
          </Txt>
        </PressableScale>
      </View>

      <View style={styles.codeRow}>
        <KeyRound size={18} color={colors.textMuted} strokeWidth={1.9} />
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder={strings.codePlaceholder}
          placeholderTextColor={colors.textFaint}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          selectionColor={colors.accent}
          style={styles.codeInput}
          onSubmitEditing={joinCode}
        />
        <PressableScale onPress={joinCode} style={styles.codeBtn} scaleTo={0.94}>
          {busy ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <Txt size={13} weight="semibold">
              {strings.join}
            </Txt>
          )}
        </PressableScale>
      </View>
      {error ? (
        <Txt size={13} color={colors.down} style={{ paddingHorizontal: space.lg, marginTop: space.sm }}>
          {error}
        </Txt>
      ) : null}

      {data === null ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} />
      ) : (
        <>
          <SectionLabel text={strings.myGroups} />
          {data.mine.length === 0 ? (
            <Empty text={strings.noGroups} />
          ) : (
            <Glass style={styles.groupCard}>
              {data.mine.map((g, i) => (
                <GroupRow
                  key={g.id}
                  group={g}
                  first={i === 0}
                  onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })}
                />
              ))}
            </Glass>
          )}
          {data.discover.length > 0 ? (
            <>
              <SectionLabel text={strings.discover} />
              <Glass style={styles.groupCard}>
                {data.discover.map((g, i) => (
                  <GroupRow
                    key={g.id}
                    group={g}
                    first={i === 0}
                    onPress={() => join(g)}
                    joinLabel={strings.join}
                  />
                ))}
              </Glass>
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

function GroupRow({
  group,
  first,
  onPress,
  joinLabel,
}: {
  group: Group;
  first: boolean;
  onPress: () => void;
  joinLabel?: string;
}) {
  const PrivacyIcon = group.isPublic ? Globe : Lock;
  const ago = group.lastMessageAt ? formatAgo(group.lastMessageAt) : '';
  return (
    <PressableScale scaleTo={0.98} onPress={onPress} style={[styles.groupRow, !first && styles.divider]}>
      <View style={[styles.groupAvatar, { backgroundColor: bannerColors(group.banner)[0] }]}>
        <Txt size={16} weight="bold" color="#FFFFFF">
          {group.name[0]?.toUpperCase()}
        </Txt>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt size={15} weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {group.name}
          </Txt>
          <PrivacyIcon size={12} color={colors.textMuted} strokeWidth={2} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Users size={12} color={colors.textFaint} strokeWidth={2} />
          <Txt size={12} color={colors.textMuted} numberOfLines={1}>
            {group.memberCount} {strings.members}
            {ago ? ` · ${ago}` : ''}
            {group.description ? ` · ${group.description}` : ''}
          </Txt>
        </View>
      </View>
      {joinLabel ? (
        <View style={styles.joinPill}>
          <Txt size={12} weight="semibold" color={colors.accentInk}>
            {joinLabel}
          </Txt>
        </View>
      ) : (
        <ChevronRight size={18} color={colors.textMuted} />
      )}
    </PressableScale>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <Txt size={13} weight="semibold" color={colors.textMuted} style={styles.section}>
      {text.toUpperCase()}
    </Txt>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Glass style={styles.empty}>
      <Txt size={14} color={colors.textMuted} style={{ textAlign: 'center' }}>
        {text}
      </Txt>
    </Glass>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: 110,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    marginBottom: space.lg,
  },
  pad: { paddingHorizontal: space.lg },
  list: { paddingHorizontal: space.lg, marginTop: space.lg, gap: space.md },
  empty: { marginHorizontal: space.lg, marginTop: space.lg, padding: space.xl },
  actions: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, marginTop: space.lg },
  actionBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    marginTop: space.md,
    paddingLeft: space.lg,
    paddingRight: 6,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeInput: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 15, letterSpacing: 2 },
  codeBtn: {
    height: 40,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { paddingHorizontal: space.xl, marginTop: space.xl, marginBottom: space.sm },
  groupCard: { marginHorizontal: space.lg, borderRadius: radius.md },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  groupAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
});
