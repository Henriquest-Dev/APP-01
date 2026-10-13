import { useCallback, useEffect, useState } from 'react';

import {
  deletePost,
  fetchMyFlags,
  fetchPost,
  fetchPosts,
  setBookmark,
  setLike,
  setRepost,
  type Post,
} from '@/lib/posts';
import { supabase } from '@/lib/supabase';

type Kind = 'liked' | 'reposted' | 'saved';

/**
 * Posts feed with likes, reposts and bookmarks, kept live: new posts, likes,
 * reposts and comment counts update in about a second.
 */
export function usePosts(userId: string | undefined, enabled = true) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [flags, setFlags] = useState<Record<Kind, Set<string>>>({
    liked: new Set(),
    reposted: new Set(),
    saved: new Set(),
  });

  const refreshOne = useCallback(async (id: string) => {
    const fresh = await fetchPost(id);
    if (!fresh) return;
    setPosts(
      (prev) =>
        prev?.map((p) =>
          p.id === id ? { ...p, ...fresh, repostedBy: p.repostedBy, sortAt: p.sortAt } : p,
        ) ?? prev,
    );
  }, []);

  const load = useCallback(async () => {
    const rows = await fetchPosts();
    setPosts(rows);
    if (userId)
      setFlags(
        await fetchMyFlags(
          userId,
          rows.map((p) => p.id),
        ),
      );
  }, [userId]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    fetchPosts().then(async (rows) => {
      if (!alive) return;
      setPosts(rows);
      if (userId) {
        const mine = await fetchMyFlags(
          userId,
          rows.map((p) => p.id),
        );
        if (alive) setFlags(mine);
      }
    });

    const channel = supabase
      .channel(`posts-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (p) => {
        const post = await fetchPost((p.new as { id: string }).id);
        if (alive && post)
          setPosts((prev) => (prev?.some((x) => x.id === post.id) ? prev : [post, ...(prev ?? [])]));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (p) => {
        const id = (p.old as { id?: string }).id;
        if (id) setPosts((prev) => prev?.filter((x) => x.id !== id) ?? prev);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, (p) => {
        const row = (p.new && 'post_id' in p.new ? p.new : p.old) as { post_id?: string };
        if (row.post_id) refreshOne(row.post_id);
      })
      // A repost can create a new feed entry, so reload (debounced) instead of patching.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reposts' }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => alive && load(), 400);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments' }, (p) => {
        const id = (p.new as { post_id: string }).post_id;
        setPosts(
          (prev) => prev?.map((x) => (x.id === id ? { ...x, commentCount: x.commentCount + 1 } : x)) ?? prev,
        );
      })
      .subscribe();

    return () => {
      alive = false;
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [userId, enabled, refreshOne, load]);

  /** Flips one of my flags on a post with an instant update; rolls back if the server refuses. */
  const toggleFlag = async (kind: Kind, post: Post) => {
    if (!userId) return false;
    const was = flags[kind].has(post.id);
    const apply = (on: boolean) => {
      setFlags((prev) => {
        const next = new Set(prev[kind]);
        if (on) next.add(post.id);
        else next.delete(post.id);
        return { ...prev, [kind]: next };
      });
    };
    const bump = (delta: number) =>
      setPosts(
        (prev) =>
          prev?.map((p) =>
            p.id === post.id
              ? kind === 'liked'
                ? { ...p, likeCount: p.likeCount + delta }
                : kind === 'reposted'
                  ? { ...p, repostCount: p.repostCount + delta }
                  : p
              : p,
          ) ?? prev,
      );
    apply(!was);
    bump(was ? -1 : 1);
    try {
      const run = kind === 'liked' ? setLike : kind === 'reposted' ? setRepost : setBookmark;
      await run(post.id, !was, userId);
    } catch {
      apply(was);
      bump(was ? 1 : -1);
      return false;
    }
    return true;
  };

  const remove = async (post: Post) => {
    await deletePost(post);
    setPosts((prev) => prev?.filter((p) => p.id !== post.id) ?? prev);
  };

  return {
    posts,
    liked: flags.liked,
    reposted: flags.reposted,
    saved: flags.saved,
    toggleLike: (post: Post) => toggleFlag('liked', post),
    toggleRepost: (post: Post) => toggleFlag('reposted', post),
    toggleSave: (post: Post) => toggleFlag('saved', post),
    remove,
  };
}
