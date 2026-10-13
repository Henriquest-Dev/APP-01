import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ban, Flag, Heart, MessageCircle, MoreHorizontal, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { strings } from '@/i18n';
import { formatAgo } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import type { Post } from '@/lib/posts';
import { colors, radius, space } from '@/theme';
import { ActionSheet, type SheetAction } from './action-sheet';
import { PostVideo } from './post-video';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

type Props = {
  post: Post;
  liked: boolean;
  isMine: boolean;
  onLike: () => void;
  onReport: () => void;
  onBlock: () => void;
  onDelete: () => void;
  /** Detail screen shows the full text and no comment shortcut. */
  detail?: boolean;
};

export function PostCard({ post, liked, isMine, onLike, onReport, onBlock, onDelete, detail }: Props) {
  const [menu, setMenu] = useState(false);
  const heart = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heart.value }] }));
  const aspect = post.width && post.height ? Math.max(0.6, Math.min(1.9, post.width / post.height)) : 1;
  const open = () => !detail && router.push({ pathname: '/post/[id]', params: { id: post.id } });

  const like = () => {
    heart.set(withSequence(withSpring(1.35, { damping: 6 }), withSpring(1, { damping: 10 })));
    haptic.tap();
    onLike();
  };

  const actions: SheetAction[] = isMine
    ? [{ label: strings.deletePost, icon: Trash2, onPress: onDelete, destructive: true }]
    : [
        { label: strings.report, icon: Flag, onPress: onReport },
        { label: `${strings.blockUser} @${post.username}`, icon: Ban, onPress: onBlock, destructive: true },
      ];

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.avatar}>
          <Txt size={13} weight="bold">
            {post.username[0]?.toUpperCase() ?? '?'}
          </Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt size={14} weight="semibold" numberOfLines={1}>
            @{post.username}
          </Txt>
          <Txt size={12} color={colors.textFaint}>
            {formatAgo(post.createdAt) || strings.justNow}
          </Txt>
        </View>
        <PressableScale hitSlop={10} onPress={() => setMenu(true)} scaleTo={0.85} style={styles.more}>
          <MoreHorizontal size={20} color={colors.textMuted} />
        </PressableScale>
      </View>

      {post.body ? (
        <PressableScale scaleTo={1} onPress={open}>
          <Txt size={15} style={styles.body} numberOfLines={detail ? undefined : 6}>
            {post.body}
          </Txt>
        </PressableScale>
      ) : null}

      {post.mediaUrl && post.mediaType === 'image' ? (
        <PressableScale scaleTo={0.99} onPress={open}>
          <Image
            source={{ uri: post.mediaUrl }}
            style={[styles.media, { aspectRatio: aspect }]}
            contentFit="cover"
            transition={250}
          />
        </PressableScale>
      ) : null}
      {post.mediaUrl && post.mediaType === 'video' ? (
        <View style={styles.mediaWrap}>
          <PostVideo uri={post.mediaUrl} aspect={aspect} />
        </View>
      ) : null}

      <View style={styles.actions}>
        <PressableScale
          onPress={like}
          scaleTo={0.9}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel="Like">
          <Animated.View style={heartStyle}>
            <Heart
              size={20}
              color={liked ? colors.down : colors.textMuted}
              fill={liked ? colors.down : 'transparent'}
              strokeWidth={2}
            />
          </Animated.View>
          <Txt size={13} color={liked ? colors.down : colors.textMuted} numeric>
            {post.likeCount}
          </Txt>
        </PressableScale>
        <PressableScale onPress={open} scaleTo={0.9} style={styles.action} accessibilityRole="button">
          <MessageCircle size={20} color={colors.textMuted} strokeWidth={2} />
          <Txt size={13} color={colors.textMuted} numeric>
            {post.commentCount}
          </Txt>
        </PressableScale>
      </View>

      <ActionSheet visible={menu} actions={actions} onClose={() => setMenu(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    paddingBottom: space.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  more: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: space.lg, paddingBottom: space.md, lineHeight: 21 },
  media: { width: '100%', backgroundColor: colors.surfaceRaised },
  mediaWrap: { width: '100%' },
  actions: { flexDirection: 'row', gap: space.xl, paddingHorizontal: space.lg, paddingVertical: space.md },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
