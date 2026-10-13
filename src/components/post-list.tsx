import { router } from 'expo-router';
import { Bookmark, ImagePlus } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { usePosts } from '@/hooks/use-posts';
import { strings } from '@/i18n';
import { haptic } from '@/lib/haptics';
import { report } from '@/lib/safety';
import { useBlocks } from '@/state/blocks';
import { useSession } from '@/state/session';
import { colors, motion, radius, space } from '@/theme';
import { Glass } from './glass';
import { IconButton } from './icon-button';
import { PostCard } from './post-card';
import { PressableScale } from './pressable-scale';
import { Txt } from './text';

/** Posts tab of the community: composer button + live list. */
export function PostList({ onNotice }: { onNotice: (text: string) => void }) {
  const { user } = useSession();
  const { isBlocked, block } = useBlocks();
  const { posts, liked, reposted, saved, toggleLike, toggleRepost, toggleSave, remove } = usePosts(user?.id);

  const visible = (posts ?? []).filter(
    (p) => !isBlocked(p.userId) && !(p.repostedBy && isBlocked(p.repostedBy.id)),
  );
  const needAccount = async (ok: Promise<boolean>) => {
    if (!(await ok)) onNotice(strings.accountNeeded);
  };

  return (
    <View>
      <View style={styles.composeRow}>
        <PressableScale
          accessibilityRole="button"
          onPress={() => (user ? router.push('/post/new') : onNotice(strings.accountNeeded))}
          style={styles.compose}>
          <View style={styles.composeIcon}>
            <ImagePlus size={18} color={colors.accentInk} strokeWidth={2.2} />
          </View>
          <Txt size={15} color={colors.textMuted} numberOfLines={1} style={{ flex: 1 }}>
            {strings.newPostPrompt}
          </Txt>
        </PressableScale>
        <IconButton
          icon={Bookmark}
          label={strings.savedPosts}
          onPress={() => (user ? router.push('/saved') : onNotice(strings.accountNeeded))}
          size={52}
        />
      </View>

      {posts === null ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} />
      ) : visible.length === 0 ? (
        <Glass style={styles.empty}>
          <Txt size={14} color={colors.textMuted} style={{ textAlign: 'center' }}>
            {strings.noPosts}
          </Txt>
        </Glass>
      ) : (
        <View style={styles.list}>
          {visible.map((p, i) => (
            <Animated.View
              key={`${p.id}-${p.repostedBy?.id ?? ''}`}
              layout={LinearTransition.duration(motion.base)}
              entering={FadeInDown.delay(Math.min(i, 6) * motion.stagger).duration(motion.base)}>
              <PostCard
                post={p}
                liked={liked.has(p.id)}
                reposted={reposted.has(p.id)}
                saved={saved.has(p.id)}
                isMine={p.userId === user?.id}
                onLike={() => needAccount(toggleLike(p))}
                onRepost={() => needAccount(toggleRepost(p))}
                onSave={async () => {
                  const ok = await toggleSave(p);
                  onNotice(
                    ok
                      ? saved.has(p.id)
                        ? strings.removedFromSaved
                        : strings.addedToSaved
                      : strings.accountNeeded,
                  );
                }}
                onReport={async () => {
                  try {
                    await report('post', p.id);
                    haptic.success();
                    onNotice(strings.reportThanks);
                  } catch {
                    onNotice(strings.accountNeeded);
                  }
                }}
                onBlock={async () => {
                  try {
                    await block(p.userId, p.username);
                    onNotice(strings.blockedNotice);
                  } catch {
                    onNotice(strings.accountNeeded);
                  }
                }}
                onDelete={async () => {
                  try {
                    await remove(p);
                  } catch {
                    onNotice(strings.callFailed);
                  }
                }}
              />
            </Animated.View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  composeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    marginTop: space.lg,
  },
  compose: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  composeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { marginHorizontal: space.lg, marginTop: space.lg, padding: space.xl },
  list: { paddingHorizontal: space.lg, marginTop: space.lg, gap: space.lg },
});
