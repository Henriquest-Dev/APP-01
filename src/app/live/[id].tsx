import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ExternalLink, Flag, Play, Share2, Square } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Share, StyleSheet, View } from 'react-native';

import { Glass } from '@/components/glass';
import { IconButton } from '@/components/icon-button';
import { LiveBadge } from '@/components/live-card';
import { LivePlayer } from '@/components/live-player';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { embedSrc, endLive, fetchLive, PROVIDER_NAMES, type Live } from '@/lib/lives';
import { report } from '@/lib/safety';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/state/session';
import { colors, radius, space } from '@/theme';

export default function LiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [live, setLive] = useState<Live | null | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);
  const mine = !!live && live.userId === user?.id;

  useEffect(() => {
    let alive = true;
    const load = () => fetchLive(id).then((l) => alive && setLive(l));
    load();
    // When the host ends the live, viewers see it right away.
    const channel = supabase
      .channel(`live-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lives', filter: `id=eq.${id}` },
        load,
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  const share = () => {
    if (!live) return;
    Share.share({
      message: strings.liveShareMessage
        .replace('{name}', live.handle)
        .replace('{title}', live.title)
        .replace('{link}', `callout://live/${live.id}`),
    }).catch(() => {});
  };

  const finish = async () => {
    if (!live) return;
    if (await endLive(live.id)) {
      haptic.success();
      router.back();
    } else setNotice(strings.callFailed);
  };

  const flag = async () => {
    if (!live) return;
    try {
      await report('live', live.id);
      haptic.success();
      setNotice(strings.reportThanks);
    } catch {
      setNotice(strings.accountNeeded);
    }
  };

  const header = (
    <View style={styles.header}>
      <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
      <View style={{ flex: 1 }} />
      {live ? <IconButton icon={Share2} label={strings.liveShare} onPress={share} /> : null}
    </View>
  );

  if (live === undefined)
    return (
      <Screen withTabBar={false} header={header}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} />
      </Screen>
    );

  if (live === null)
    return (
      <Screen withTabBar={false} header={header}>
        <Txt color={colors.textMuted} style={{ textAlign: 'center', marginTop: space.xxl }}>
          {strings.liveEnded}
        </Txt>
      </Screen>
    );

  const src = embedSrc(live);
  const provider = PROVIDER_NAMES[live.provider];

  return (
    <Screen withTabBar={false} header={header}>
      <View style={styles.pad}>
        {src ? (
          <LivePlayer src={src} />
        ) : (
          <Glass style={styles.external}>
            <Play size={28} color={colors.accent} fill={colors.accent} />
          </Glass>
        )}
      </View>

      <View style={[styles.pad, { gap: space.sm, marginTop: space.lg }]}>
        <LiveBadge />
        <Txt size={20} weight="bold">
          {live.title}
        </Txt>
        <PressableScale
          scaleTo={0.98}
          onPress={() => router.push({ pathname: '/user/[id]', params: { id: live.userId } })}>
          <Txt size={14} color={colors.textMuted}>
            {strings.liveBy}{' '}
            <Txt size={14} weight="semibold">
              @{live.handle}
            </Txt>
          </Txt>
        </PressableScale>
      </View>

      <View style={[styles.pad, { gap: space.sm, marginTop: space.xl }]}>
        <PressableScale
          accessibilityRole="button"
          onPress={() => Linking.openURL(live.url).catch(() => {})}
          style={[styles.btn, !src && { backgroundColor: colors.accent }]}>
          <ExternalLink size={17} color={src ? colors.text : colors.accentInk} strokeWidth={2.1} />
          <Txt size={14} weight="semibold" color={src ? colors.text : colors.accentInk}>
            {strings.liveOpenIn.replace(
              '{name}',
              provider || new URL(live.url).hostname.replace(/^www\./, ''),
            )}
          </Txt>
        </PressableScale>
        {mine ? (
          <PressableScale accessibilityRole="button" onPress={finish} style={[styles.btn, styles.end]}>
            <Square size={16} color={colors.down} strokeWidth={2.2} />
            <Txt size={14} weight="semibold" color={colors.down}>
              {strings.liveEnd}
            </Txt>
          </PressableScale>
        ) : (
          <PressableScale accessibilityRole="button" onPress={flag} style={styles.btn}>
            <Flag size={16} color={colors.textMuted} strokeWidth={2} />
            <Txt size={14} weight="semibold" color={colors.textMuted}>
              {strings.report}
            </Txt>
          </PressableScale>
        )}
        {notice ? (
          <Txt size={13} color={colors.textMuted} style={{ textAlign: 'center' }}>
            {notice}
          </Txt>
        ) : null}
        <Txt size={12} color={colors.textFaint} style={{ textAlign: 'center', marginTop: space.sm }}>
          {strings.liveNotice}
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg },
  pad: { paddingHorizontal: space.lg },
  external: { padding: space.xl, alignItems: 'center' },
  btn: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  end: { backgroundColor: colors.downSoft },
});
