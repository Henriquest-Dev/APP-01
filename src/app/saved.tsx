import { router, useFocusEffect } from 'expo-router';
import { Bookmark, ChevronLeft } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Glass } from '@/components/glass';
import { IconButton } from '@/components/icon-button';
import { PostCard } from '@/components/post-card';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import {
  deletePost,
  fetchMyFlags,
  fetchSavedPosts,
  setBookmark,
  setLike,
  setRepost,
  type Post,
} from '@/lib/posts';
import { report } from '@/lib/safety';
import { useBlocks } from '@/state/blocks';
import { useSession } from '@/state/session';
import { colors, motion, space } from '@/theme';

export default function Saved() {
  const { user } = useSession();
  const { isBlocked, block } = useBlocks();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [flags, setFlags] = useState({ liked: new Set<string>(), reposted: new Set<string>() });

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      fetchSavedPosts().then(async (rows) => {
        if (!alive) return;
        setPosts(rows);
        if (user) {
          const f = await fetchMyFlags(
            user.id,
            rows.map((p) => p.id),
          );
          if (alive) setFlags({ liked: f.liked, reposted: f.reposted });
        }
      });
      return () => {
        alive = false;
      };
    }, [user]),
  );

  const flip = async (kind: 'liked' | 'reposted', post: Post) => {
    if (!user) return;
    const was = flags[kind].has(post.id);
    setFlags((prev) => {
      const next = new Set(prev[kind]);
      if (was) next.delete(post.id);
      else next.add(post.id);
      return { ...prev, [kind]: next };
    });
    setPosts(
      (prev) =>
        prev?.map((p) =>
          p.id === post.id
            ? kind === 'liked'
              ? { ...p, likeCount: p.likeCount + (was ? -1 : 1) }
              : { ...p, repostCount: p.repostCount + (was ? -1 : 1) }
            : p,
        ) ?? prev,
    );
    await (kind === 'liked' ? setLike : setRepost)(post.id, !was, user.id).catch(() => {});
  };

  const visible = (posts ?? []).filter((p) => !isBlocked(p.userId));

  return (
    <Screen
      withTabBar={false}
      header={
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
          <Txt size={17} weight="semibold">
            {strings.savedPosts}
          </Txt>
          <View style={{ width: 42 }} />
        </View>
      }>
      {posts === null ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} />
      ) : visible.length === 0 ? (
        <Glass style={styles.empty}>
          <Bookmark size={30} color={colors.textMuted} strokeWidth={1.6} />
          <Txt size={14} color={colors.textMuted} style={{ textAlign: 'center' }}>
            {strings.noSaved}
          </Txt>
        </Glass>
      ) : (
        <View style={styles.list}>
          {visible.map((p, i) => (
            <Animated.View
              key={p.id}
              entering={FadeInDown.delay(Math.min(i, 6) * motion.stagger).duration(motion.base)}>
              <PostCard
                post={p}
                liked={flags.liked.has(p.id)}
                reposted={flags.reposted.has(p.id)}
                saved
                isMine={p.userId === user?.id}
                onLike={() => flip('liked', p)}
                onRepost={() => flip('reposted', p)}
                onSave={async () => {
                  if (!user) return;
                  await setBookmark(p.id, false, user.id).catch(() => {});
                  setPosts((prev) => prev?.filter((x) => x.id !== p.id) ?? prev);
                }}
                onReport={() => report('post', p.id).catch(() => {})}
                onBlock={() => block(p.userId, p.username).catch(() => {})}
                onDelete={() =>
                  deletePost(p)
                    .then(() => setPosts((prev) => prev?.filter((x) => x.id !== p.id) ?? prev))
                    .catch(() => {})
                }
              />
            </Animated.View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  empty: {
    marginHorizontal: space.lg,
    marginTop: space.lg,
    padding: space.xl,
    gap: space.md,
    alignItems: 'center',
  },
  list: { paddingHorizontal: space.lg, marginTop: space.md, gap: space.lg },
});
