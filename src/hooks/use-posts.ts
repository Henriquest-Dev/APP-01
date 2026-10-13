import { useCallback, useEffect, useState } from 'react';

import { deletePost, fetchMyLikes, fetchPost, fetchPosts, setLike, type Post } from '@/lib/posts';
import { supabase } from '@/lib/supabase';

/** Posts feed with likes, kept live: new posts, likes and comment counts update in about a second. */
export function usePosts(userId: string | undefined, enabled = true) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const refreshOne = useCallback(async (id: string) => {
    const fresh = await fetchPost(id);
    if (fresh) setPosts((prev) => prev?.map((p) => (p.id === id ? fresh : p)) ?? prev);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetchPosts().then(async (rows) => {
      if (!alive) return;
      setPosts(rows);
      if (userId) {
        const mine = await fetchMyLikes(
          userId,
          rows.map((p) => p.id),
        );
        if (alive) setLiked(mine);
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments' }, (p) => {
        const id = (p.new as { post_id: string }).post_id;
        setPosts(
          (prev) => prev?.map((x) => (x.id === id ? { ...x, commentCount: x.commentCount + 1 } : x)) ?? prev,
        );
      })
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [userId, enabled, refreshOne]);

  const toggleLike = async (post: Post) => {
    if (!userId) return false;
    const was = liked.has(post.id);
    // Optimistic: flip now, the realtime event confirms the count.
    setLiked((prev) => {
      const next = new Set(prev);
      if (was) next.delete(post.id);
      else next.add(post.id);
      return next;
    });
    setPosts(
      (prev) =>
        prev?.map((p) => (p.id === post.id ? { ...p, likeCount: p.likeCount + (was ? -1 : 1) } : p)) ?? prev,
    );
    try {
      await setLike(post.id, !was, userId);
    } catch {
      setLiked((prev) => {
        const next = new Set(prev);
        if (was) next.add(post.id);
        else next.delete(post.id);
        return next;
      });
      refreshOne(post.id);
    }
    return true;
  };

  const remove = async (post: Post) => {
    await deletePost(post);
    setPosts((prev) => prev?.filter((p) => p.id !== post.id) ?? prev);
  };

  return { posts, liked, toggleLike, remove, setLiked, setPosts };
}
