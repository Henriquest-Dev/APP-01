import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ban, Flag, MoreHorizontal, Repeat2, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { strings } from '@/i18n';
import { formatAgo } from '@/lib/format';
import { recordView, type Post } from '@/lib/posts';
import { colors, radius, space } from '@/theme';
import { ActionSheet, type SheetAction } from './action-sheet';
import { PostActions } from './post-actions';
import { PostVideo } from './post-video';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

type Props = {
  post: Post;
  liked: boolean;
  reposted: boolean;
  saved: boolean;
  isMine: boolean;
  onLike: () => void;
  onRepost: () => void;
  onSave: () => void;
  onReport: () => void;
  onBlock: () => void;
  onDelete: () => void;
  /** Detail screen shows the full text, and the comment button just focuses the composer. */
  detail?: boolean;
  onComment?: () => void;
};

export function PostCard({
  post,
  liked,
  reposted,
  saved,
  isMine,
  onLike,
  onRepost,
  onSave,
  onReport,
  onBlock,
  onDelete,
  detail,
  onComment,
}: Props) {
  const [menu, setMenu] = useState(false);
  const aspect = post.width && post.height ? Math.max(0.6, Math.min(1.9, post.width / post.height)) : 1;
  const open = () => !detail && router.push({ pathname: '/post/[id]', params: { id: post.id } });

  // A post counts as viewed once it has stayed on screen for a moment.
  useEffect(() => {
    const t = setTimeout(() => recordView(post.id).catch(() => {}), 1200);
    return () => clearTimeout(t);
  }, [post.id]);

  const share = () =>
    Share.share({
      message: strings.sharePostMessage
        .replace('{name}', post.username)
        .replace('{text}', post.body.slice(0, 140) || (post.mediaType === 'video' ? '🎬' : '🖼️'))
        .replace('{link}', `callout://post/${post.id}`),
    }).catch(() => {});

  const actions: SheetAction[] = isMine
    ? [{ label: strings.deletePost, icon: Trash2, onPress: onDelete, destructive: true }]
    : [
        { label: strings.report, icon: Flag, onPress: onReport },
        { label: `${strings.blockUser} @${post.username}`, icon: Ban, onPress: onBlock, destructive: true },
      ];

  return (
    <View style={styles.card}>
      {post.repostedBy ? (
        <View style={styles.repostBanner}>
          <Repeat2 size={14} color={colors.textMuted} strokeWidth={2.2} />
          <Txt size={12} weight="semibold" color={colors.textMuted}>
            {strings.repostedBy.replace('{name}', post.repostedBy.username)}
          </Txt>
        </View>
      ) : null}

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
        <PressableScale scaleTo={0.99} onPress={open} style={styles.media}>
          <Image
            source={{ uri: post.mediaUrl }}
            style={{ width: '100%', aspectRatio: aspect }}
            contentFit="cover"
            transition={250}
          />
        </PressableScale>
      ) : null}
      {post.mediaUrl && post.mediaType === 'video' ? (
        <View style={styles.media}>
          <PostVideo uri={post.mediaUrl} aspect={aspect} />
        </View>
      ) : null}

      <PostActions
        comments={post.commentCount}
        reposts={post.repostCount}
        likes={post.likeCount}
        views={post.viewCount}
        liked={liked}
        reposted={reposted}
        saved={saved}
        onComment={onComment ?? open}
        onRepost={onRepost}
        onLike={onLike}
        onSave={onSave}
        onShare={share}
      />

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
  repostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
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
  // Rounded media inset from the card edges, like X.
  media: {
    marginHorizontal: space.lg,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surfaceRaised,
  },
});
