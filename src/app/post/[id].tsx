import { router, useLocalSearchParams } from 'expo-router';
import { Ban, ChevronLeft, Flag, SendHorizontal, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { Background } from '@/components/background';
import { IconButton } from '@/components/icon-button';
import { LiveDot } from '@/components/live-dot';
import { PostCard } from '@/components/post-card';
import { PressableScale } from '@/components/pressable-scale';
import { Txt } from '@/components/text';
import { strings } from '@/i18n';
import { fetchUsernames } from '@/lib/community';
import { formatAgo } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import {
  addComment,
  deleteComment,
  deletePost,
  fetchComments,
  fetchMyLikes,
  fetchPost,
  setLike,
  type Comment,
  type Post,
} from '@/lib/posts';
import { report } from '@/lib/safety';
import { supabase } from '@/lib/supabase';
import { useBlocks } from '@/state/blocks';
import { useSession } from '@/state/session';
import { colors, fonts, radius, space } from '@/theme';

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { isBlocked, block } = useBlocks();
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<Comment | null>(null);

  useEffect(() => {
    let alive = true;
    fetchPost(id).then((p) => alive && setPost(p));
    fetchComments(id).then((c) => alive && setComments(c));
    if (user) fetchMyLikes(user.id, [id]).then((s) => alive && setLiked(s.has(id)));

    const channel = supabase
      .channel(`post-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_comments', filter: `post_id=eq.${id}` },
        async (p) => {
          const r = p.new as {
            id: number;
            post_id: string;
            user_id: string;
            body: string;
            created_at: string;
          };
          const names = await fetchUsernames([r.user_id]);
          if (!alive) return;
          const c: Comment = {
            id: r.id,
            postId: r.post_id,
            userId: r.user_id,
            username: names[r.user_id] ?? '',
            body: r.body,
            createdAt: Date.parse(r.created_at),
          };
          setComments((prev) => (prev?.some((x) => x.id === c.id) ? prev : [...(prev ?? []), c]));
          setPost((prev) => (prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev));
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_likes', filter: `post_id=eq.${id}` },
        () => {
          fetchPost(id).then((p) => alive && p && setPost(p));
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [id, user]);

  const say = (t: string) => {
    setNotice(t);
    setTimeout(() => setNotice(null), 3000);
  };

  const send = async () => {
    if (!user) return say(strings.accountNeeded);
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await addComment(id, text);
      setText('');
      haptic.tap();
    } catch (e) {
      say(String((e as Error).message).includes('slow down') ? strings.tooManyMessages : strings.callFailed);
    } finally {
      setSending(false);
    }
  };

  const toggleLike = async () => {
    if (!user || !post) return say(strings.accountNeeded);
    const was = liked;
    setLiked(!was);
    setPost({ ...post, likeCount: post.likeCount + (was ? -1 : 1) });
    try {
      await setLike(post.id, !was, user.id);
    } catch {
      setLiked(was);
    }
  };

  const commentActions: SheetAction[] = selected
    ? selected.userId === user?.id
      ? [
          {
            label: strings.deleteComment,
            icon: Trash2,
            destructive: true,
            onPress: async () => {
              await deleteComment(selected.id).catch(() => {});
              setComments((prev) => prev?.filter((c) => c.id !== selected.id) ?? prev);
            },
          },
        ]
      : [
          {
            label: strings.report,
            icon: Flag,
            onPress: () =>
              report('comment', String(selected.id))
                .then(() => say(strings.reportThanks))
                .catch(() => say(strings.accountNeeded)),
          },
          {
            label: `${strings.blockUser} @${selected.username}`,
            icon: Ban,
            destructive: true,
            onPress: () =>
              block(selected.userId, selected.username)
                .then(() => say(strings.blockedNotice))
                .catch(() => say(strings.accountNeeded)),
          },
        ]
    : [];

  const visible = (comments ?? []).filter((c) => !isBlocked(c.userId));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.root, { paddingTop: insets.top + space.sm }]}>
        <Background />
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
          <Txt size={16} weight="semibold" style={{ flex: 1 }}>
            {strings.post}
          </Txt>
          <LiveDot />
        </View>

        {post === undefined ? (
          <ActivityIndicator color={colors.accent} style={{ flex: 1 }} />
        ) : post === null ? (
          <View style={styles.center}>
            <Txt color={colors.textMuted}>{strings.postGone}</Txt>
          </View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(c) => String(c.id)}
            contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xxl }}
            ListHeaderComponent={
              <View style={{ marginBottom: space.md }}>
                <PostCard
                  post={post}
                  liked={liked}
                  detail
                  isMine={post.userId === user?.id}
                  onLike={toggleLike}
                  onReport={() =>
                    report('post', post.id)
                      .then(() => say(strings.reportThanks))
                      .catch(() => say(strings.accountNeeded))
                  }
                  onBlock={() =>
                    block(post.userId, post.username)
                      .then(() => router.back())
                      .catch(() => say(strings.accountNeeded))
                  }
                  onDelete={() =>
                    deletePost(post)
                      .then(() => router.back())
                      .catch(() => say(strings.callFailed))
                  }
                />
                <Txt size={13} weight="semibold" color={colors.textMuted} style={{ marginTop: space.lg }}>
                  {strings.comments.toUpperCase()} · {post.commentCount}
                </Txt>
              </View>
            }
            ListEmptyComponent={
              comments === null ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Txt size={14} color={colors.textMuted}>
                  {strings.noComments}
                </Txt>
              )
            }
            renderItem={({ item }) => (
              <Animated.View entering={FadeInUp.duration(220)}>
                <PressableScale scaleTo={0.99} onLongPress={() => setSelected(item)} style={styles.comment}>
                  <View style={styles.avatar}>
                    <Txt size={12} weight="bold">
                      {item.username[0]?.toUpperCase() ?? '?'}
                    </Txt>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt size={13} weight="semibold">
                      @{item.username}{' '}
                      <Txt size={12} color={colors.textFaint}>
                        {formatAgo(item.createdAt) || strings.justNow}
                      </Txt>
                    </Txt>
                    <Txt size={14} style={{ lineHeight: 20 }}>
                      {item.body}
                    </Txt>
                  </View>
                </PressableScale>
              </Animated.View>
            )}
          />
        )}

        {notice ? (
          <View style={styles.toast}>
            <Txt size={13} style={{ textAlign: 'center' }}>
              {notice}
            </Txt>
          </View>
        ) : null}

        {post ? (
          <View style={[styles.composer, { paddingBottom: insets.bottom + space.sm }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={strings.commentPlaceholder}
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.accent}
              multiline
              maxLength={500}
              style={styles.input}
            />
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Send"
              onPress={send}
              scaleTo={0.9}
              style={[styles.send, !text.trim() && { opacity: 0.4 }]}>
              {sending ? (
                <ActivityIndicator color={colors.accentInk} size="small" />
              ) : (
                <SendHorizontal size={20} color={colors.accentInk} />
              )}
            </PressableScale>
          </View>
        ) : null}

        <ActionSheet visible={!!selected} actions={commentActions} onClose={() => setSelected(null)} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  comment: { flexDirection: 'row', gap: space.md },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toast: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: 100,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: 'rgba(11, 12, 20, 0.94)',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: space.lg,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
