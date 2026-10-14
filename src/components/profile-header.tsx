import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { CalendarDays, ChevronLeft, Link2, MapPin, Settings2, Sparkles } from 'lucide-react-native';
import { Linking, StyleSheet, View } from 'react-native';

import { strings } from '@/i18n';
import { badgesFor } from '@/lib/badges';
import { bannerColors } from '@/lib/banners';
import { currentLocale, formatCount } from '@/lib/format';
import type { Label } from '@/lib/profile';
import type { ProfileCard } from '@/lib/social';
import { colors, radius, space } from '@/theme';
import { Avatar } from './avatar';
import { Badges } from './badges';
import { IconButton } from './icon-button';
import { LabelChips } from './label-chips';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

type Props = {
  card: ProfileCard;
  labels: Label[];
  mine: boolean;
  /** null while loading, undefined for my own profile. */
  following?: boolean | null;
  followerDelta?: number;
  topInset: number;
  onBack?: () => void;
  onEdit?: () => void;
  onToggleFollow?: () => void;
};

/** The top of a profile, laid out like X: banner, overlapping photo, action button, name, bio, counts. */
export function ProfileHeader({
  card,
  labels,
  mine,
  following,
  followerDelta = 0,
  topInset,
  onBack,
  onEdit,
  onToggleFollow,
}: Props) {
  const [a, b] = bannerColors(card.bannerColor ?? 'violet');
  const joined = new Date(card.createdAt).toLocaleDateString(currentLocale(), { month: 'long', year: 'numeric' });
  const site = card.website.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const open = (kind: 'followers' | 'following') =>
    router.push({ pathname: '/follows/[id]', params: { id: card.id, tab: kind } });

  return (
    <View>
      <View style={styles.banner}>
        {card.bannerUrl ? (
          <Image source={{ uri: card.bannerUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : (
          <LinearGradient colors={[a, b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        )}
        <View style={[styles.floating, { top: topInset + 6 }]}>
          {onBack ? <IconButton icon={ChevronLeft} label="Back" onPress={onBack} size={38} /> : <View />}
          {mine ? (
            <IconButton icon={Settings2} label={strings.settings} onPress={() => router.push('/settings')} size={38} />
          ) : null}
        </View>
      </View>

      <View style={styles.avatarRow}>
        <Avatar userId={card.id} name={card.username} size={84} uri={card.avatarUrl} ring />
        {mine ? (
          <PressableScale accessibilityRole="button" onPress={onEdit} style={styles.outlineBtn}>
            <Txt size={14} weight="bold">
              {strings.editProfile}
            </Txt>
          </PressableScale>
        ) : (
          <PressableScale
            accessibilityRole="button"
            onPress={onToggleFollow}
            style={[styles.followBtn, following && styles.outlineBtn]}>
            <Txt size={14} weight="bold" color={following ? colors.text : colors.accentInk}>
              {following ? strings.following : strings.follow}
            </Txt>
          </PressableScale>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Txt size={21} weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {card.username}
          </Txt>
          {card.pro ? <Sparkles size={17} color={colors.accent} strokeWidth={2.2} /> : null}
        </View>
        <Txt size={14} color={colors.textMuted}>
          @{card.handle}
        </Txt>

        {card.bio ? (
          <Txt size={15} style={{ lineHeight: 21, marginTop: 4 }}>
            {card.bio}
          </Txt>
        ) : null}

        <View style={styles.meta}>
          {card.location ? (
            <View style={styles.metaItem}>
              <MapPin size={14} color={colors.textMuted} strokeWidth={2} />
              <Txt size={13} color={colors.textMuted}>
                {card.location}
              </Txt>
            </View>
          ) : null}
          {card.website ? (
            <PressableScale scaleTo={0.97} onPress={() => Linking.openURL(card.website).catch(() => {})} style={styles.metaItem}>
              <Link2 size={14} color={colors.accent} strokeWidth={2} />
              <Txt size={13} color={colors.accent} numberOfLines={1} style={{ maxWidth: 200 }}>
                {site}
              </Txt>
            </PressableScale>
          ) : null}
          <View style={styles.metaItem}>
            <CalendarDays size={14} color={colors.textMuted} strokeWidth={2} />
            <Txt size={13} color={colors.textMuted}>
              {strings.joinedOn.replace('{date}', joined)}
            </Txt>
          </View>
        </View>

        <LabelChips labels={labels} />

        <View style={styles.counts}>
          <PressableScale scaleTo={0.97} onPress={() => open('following')}>
            <Txt size={14} color={colors.textMuted}>
              <Txt size={14} weight="bold">
                {formatCount(card.following) || '0'}
              </Txt>{' '}
              {strings.followingLabel}
            </Txt>
          </PressableScale>
          <PressableScale scaleTo={0.97} onPress={() => open('followers')}>
            <Txt size={14} color={colors.textMuted}>
              <Txt size={14} weight="bold">
                {formatCount(Math.max(0, card.followers + followerDelta)) || '0'}
              </Txt>{' '}
              {strings.followers}
            </Txt>
          </PressableScale>
        </View>

        <Badges badges={badgesFor(card)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { height: 132, backgroundColor: colors.surfaceRaised },
  floating: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    marginTop: -44,
  },
  followBtn: {
    height: 38,
    paddingHorizontal: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  outlineBtn: {
    height: 38,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong ?? colors.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  body: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: 6, paddingBottom: space.lg },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: 4, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  counts: { flexDirection: 'row', gap: space.xl, marginTop: 2 },
});
