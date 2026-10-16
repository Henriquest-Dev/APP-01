import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, LogOut, Settings2, TrendingDown, TrendingUp, UserRound } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { ProLogo } from '@/components/animated-logo';
import { IconButton } from '@/components/icon-button';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CoinAvatar } from '@/components/coin-avatar';
import { Glass } from '@/components/glass';
import { PostList } from '@/components/post-list';
import { ProfileHeader } from '@/components/profile-header';
import { StickerGrid } from '@/components/sticker-grid';
import { UnderlineTabs } from '@/components/underline-tabs';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { fetchLabels, fetchStickers, type Label, type Sticker } from '@/lib/profile';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchCard, type ProfileCard } from '@/lib/social';
import { formatPercent, formatPrice, formatTimeLeft } from '@/lib/format';
import { fetchServerPrices } from '@/lib/server-prices';
import { callStats } from '@/lib/stats';
import { useCoinPrices } from '@/hooks/use-coin-prices';
import { useCalls } from '@/state/calls';
import { useMarket } from '@/state/market';
import { usePro } from '@/state/pro';
import { useSession } from '@/state/session';
import { PressableScale } from '@/components/pressable-scale';
import { colors, motion, radius, space } from '@/theme';

type Tab = 'calls' | 'posts' | 'stickers';

/** Shown for a moment (or when the server has no profile card yet). */
function fallbackCard(id: string, name: string): ProfileCard {
  return {
    id,
    username: name,
    handle:
      name
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 20) || 'callout',
    bio: '',
    createdAt: Date.now(),
    followers: 0,
    following: 0,
    callsTotal: 0,
    callsResolved: 0,
    callsHits: 0,
    pro: false,
    avatarUrl: null,
    bannerUrl: null,
    bannerColor: null,
    location: '',
    website: '',
  };
}

export default function Profile() {
  const { calls } = useCalls();
  const { user, signOut } = useSession();
  const { pro } = usePro();
  const stats = callStats(calls);
  const [tab, setTab] = useState<Tab>('calls');
  const [labels, setLabels] = useState<Label[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState<string | null>(null);
  const [card, setCard] = useState<ProfileCard | null>(null);
  const userId = user?.id;

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let alive = true;
      fetchCard(userId).then((c) => alive && setCard(c));
      fetchLabels(userId).then((l) => alive && setLabels(l));
      fetchStickers(userId).then((x) => alive && setStickers(x));
      return () => {
        alive = false;
      };
    }, [userId]),
  );
  const coinPrices = useCoinPrices(calls.filter((c) => c.status === 'open').map((c) => c.coinId));
  const serverPrices = useServerPrices(calls.filter((c) => c.status === 'open').map((c) => c.symbol));

  return (
    <Screen contentContainerStyle={user ? { paddingTop: 0 } : undefined}>
      {user ? (
        <ProfileHeader
          card={card ?? fallbackCard(user.id, user.name)}
          labels={labels}
          mine
          topInset={insets.top}
          onEdit={() => router.push('/profile/edit')}
        />
      ) : (
        <View style={styles.head}>
          <View style={styles.avatar}>
            <UserRound size={28} color={colors.text} strokeWidth={1.8} />
          </View>
          <View style={{ gap: 2, flex: 1 }}>
            <Txt size={20} weight="semibold">
              {strings.guestName}
            </Txt>
            <Txt size={13} color={colors.textMuted}>
              {strings.memberSince}
            </Txt>
          </View>
          <IconButton icon={Settings2} label={strings.settings} onPress={() => router.push('/settings')} />
        </View>
      )}

      <View style={styles.stats}>
        <Stat label={strings.callsMade} value={String(stats.total)} />
        <Stat label={strings.hitRate} value={stats.hitRate === null ? '—' : `${stats.hitRate}%`} />
        <Stat label={strings.streak} value={stats.streak ? String(stats.streak) : '—'} />
      </View>

      <PressableScale scaleTo={0.98} onPress={() => router.push('/pro')}>
        <Glass style={styles.pro}>
          <ProLogo size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt size={15} weight="semibold">
              Callout Pro
            </Txt>
            <Txt size={12} color={colors.textMuted}>
              {pro ? strings.proActive : strings.premiumSubtitle}
            </Txt>
          </View>
          <ChevronRight size={18} color={colors.textMuted} />
        </Glass>
      </PressableScale>

      {user ? (
        <View style={{ marginTop: space.lg }}>
          <UnderlineTabs<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: 'calls', label: strings.callsTab },
              { value: 'posts', label: strings.posts },
              { value: 'stickers', label: strings.stickersTitle },
            ]}
          />
        </View>
      ) : null}

      {user && tab === 'stickers' ? (
        <View style={{ marginTop: space.lg }}>
          <StickerGrid stickers={stickers} onCreate={() => router.push('/stickers')} />
        </View>
      ) : user && tab === 'posts' ? (
        <>
          <PostList authorId={user.id} onNotice={setNotice} />
          {notice ? (
            <Txt size={12} color={colors.textMuted} style={{ textAlign: 'center', marginTop: space.md }}>
              {notice}
            </Txt>
          ) : null}
        </>
      ) : (
        <Glass style={styles.list}>
          <Txt
            size={16}
            weight="semibold"
            style={{ paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm }}>
            {strings.myCalls}
          </Txt>
          {!user ? (
            <View style={styles.cta}>
              <Txt size={15} weight="semibold">
                {strings.accountNeeded}
              </Txt>
              <Txt size={13} color={colors.textMuted}>
                {strings.accountNeededText}
              </Txt>
              <PressableScale accessibilityRole="button" onPress={signOut} style={styles.ctaBtn}>
                <Txt size={14} weight="semibold" color={colors.accentInk}>
                  {strings.signUp}
                </Txt>
              </PressableScale>
            </View>
          ) : calls.length === 0 ? (
            <Txt size={14} color={colors.textMuted} style={styles.empty}>
              {strings.noCalls}
            </Txt>
          ) : (
            calls.map((call, i) => {
              const open = call.status === 'open';
              const now = open
                ? (coinPrices[call.coinId] ?? serverPrices[call.symbol] ?? call.entryPrice)
                : (call.exitPrice ?? call.entryPrice);
              const move = ((now - call.entryPrice) / call.entryPrice) * 100;
              const up = call.direction === 'up';
              const winning = open ? (up ? move >= 0 : move <= 0) : call.status === 'hit';
              const statusLabel = open
                ? `${strings.endsIn} ${formatTimeLeft(call.expiresAt)}`
                : call.status === 'hit'
                  ? strings.statusHit
                  : call.status === 'miss'
                    ? strings.statusMiss
                    : strings.statusVoid;
              const Icon = up ? TrendingUp : TrendingDown;
              return (
                <Animated.View
                  key={call.id}
                  entering={FadeInDown.delay(i * motion.stagger).duration(motion.base)}
                  style={styles.call}>
                  <CoinAvatar uri={call.image} symbol={call.symbol} size={38} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Txt size={15} weight="semibold">
                        {call.symbol}
                      </Txt>
                      <View style={[styles.tag, { backgroundColor: up ? colors.upSoft : colors.downSoft }]}>
                        <Icon size={12} color={up ? colors.up : colors.down} strokeWidth={2.2} />
                        <Txt size={11} weight="semibold" color={up ? colors.up : colors.down}>
                          {call.timeframe}
                        </Txt>
                      </View>
                    </View>
                    <Txt size={12} color={colors.textMuted} numeric>
                      {strings.entry} {formatPrice(call.entryPrice)}
                      {call.targetPrice ? ` · ${strings.target} ${formatPrice(call.targetPrice)}` : ''}
                    </Txt>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 3 }}>
                    <Txt size={15} weight="semibold" color={winning ? colors.up : colors.down} numeric>
                      {formatPercent(move)}
                    </Txt>
                    {open ? (
                      <Txt size={12} color={colors.textMuted}>
                        {statusLabel}
                      </Txt>
                    ) : (
                      <View
                        style={[
                          styles.status,
                          {
                            backgroundColor:
                              call.status === 'hit'
                                ? colors.upSoft
                                : call.status === 'miss'
                                  ? colors.downSoft
                                  : colors.surfaceRaised,
                          },
                        ]}>
                        <Txt
                          size={11}
                          weight="semibold"
                          color={
                            call.status === 'hit'
                              ? colors.up
                              : call.status === 'miss'
                                ? colors.down
                                : colors.textMuted
                          }>
                          {statusLabel}
                        </Txt>
                      </View>
                    )}
                  </View>
                </Animated.View>
              );
            })
          )}
        </Glass>
      )}

      <PressableScale accessibilityRole="button" onPress={signOut} style={styles.signOut} scaleTo={0.97}>
        <LogOut size={17} color={colors.down} strokeWidth={2} />
        <Txt size={14} weight="semibold" color={colors.down}>
          {strings.signOut}
        </Txt>
      </PressableScale>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Glass style={styles.stat}>
      <Txt size={22} weight="semibold" numeric>
        {value}
      </Txt>
      <Txt size={12} color={colors.textMuted}>
        {label}
      </Txt>
    </Glass>
  );
}

const styles = StyleSheet.create({
  social: { gap: space.sm, marginBottom: space.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: space.lg },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, marginTop: space.xl },
  stat: { flex: 1, padding: space.lg, gap: 2, borderRadius: radius.md },
  pro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: space.lg,
    marginTop: space.md,
    padding: space.lg,
    borderRadius: radius.md,
  },
  proIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { marginHorizontal: space.lg, marginTop: space.md, paddingBottom: space.sm },
  empty: { paddingHorizontal: space.lg, paddingBottom: space.lg, lineHeight: 21 },
  call: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: 11,
  },
  cta: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: 6 },
  ctaBtn: {
    alignSelf: 'flex-start',
    marginTop: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  status: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  signOut: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'center',
    alignItems: 'center',
    marginTop: space.xl,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
});

/** Prices of the coins in open calls, from the same source that settles them. */
function useServerPrices(symbols: string[]) {
  const key = [...new Set(symbols)].sort().join(',');
  const [prices, setPrices] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!key) return;
    let alive = true;
    const load = () =>
      fetchServerPrices(key.split(','))
        .then((p) => alive && setPrices(p))
        .catch(() => {});
    load();
    const timer = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [key]);
  return prices;
}
