import { File } from 'expo-file-system';

import { supabase } from './supabase';

export type Post = {
  id: string;
  userId: string;
  username: string;
  body: string;
  mediaType: 'image' | 'video' | null;
  mediaUrl: string | null;
  mediaPath: string | null;
  width: number | null;
  height: number | null;
  coinId: string | null;
  createdAt: number;
  likeCount: number;
  commentCount: number;
};

export type Comment = {
  id: number;
  postId: string;
  userId: string;
  username: string;
  body: string;
  createdAt: number;
};

export type PickedMedia = {
  uri: string;
  type: 'image' | 'video';
  mimeType: string;
  width: number;
  height: number;
};

const POST_COLUMNS =
  'id, user_id, username, body, media_type, media_path, media_width, media_height, coin_id, created_at, like_count, comment_count';

export function mediaUrl(path: string | null) {
  return path ? supabase.storage.from('media').getPublicUrl(path).data.publicUrl : null;
}

function toPost(r: any): Post {
  return {
    id: r.id,
    userId: r.user_id,
    username: r.username ?? '',
    body: r.body ?? '',
    mediaType: r.media_type,
    mediaPath: r.media_path,
    mediaUrl: mediaUrl(r.media_path),
    width: r.media_width,
    height: r.media_height,
    coinId: r.coin_id,
    createdAt: Date.parse(r.created_at),
    likeCount: r.like_count ?? 0,
    commentCount: r.comment_count ?? 0,
  };
}

export async function fetchPosts(opts: { userId?: string; limit?: number } = {}) {
  let q = supabase.from('post_feed').select(POST_COLUMNS).order('created_at', { ascending: false });
  if (opts.userId) q = q.eq('user_id', opts.userId);
  const { data } = await q.limit(opts.limit ?? 40);
  return (data ?? []).map(toPost);
}

export async function fetchPost(id: string) {
  const { data } = await supabase.from('post_feed').select(POST_COLUMNS).eq('id', id).maybeSingle();
  return data ? toPost(data) : null;
}

export async function fetchMyLikes(userId: string, postIds: string[]) {
  if (!postIds.length) return new Set<string>();
  const { data } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds);
  return new Set((data ?? []).map((r) => r.post_id as string));
}

export async function setLike(postId: string, liked: boolean, userId: string) {
  const { error } = liked
    ? await supabase.from('post_likes').insert({ post_id: postId })
    : await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
  if (error && !error.message.includes('duplicate')) throw error;
}

/** Uploads to media/<user id>/<timestamp>.<ext> and creates the post. */
export async function createPost(
  userId: string,
  body: string,
  media: PickedMedia | null,
  coinId?: string | null,
) {
  let path: string | null = null;
  if (media) {
    const ext = media.mimeType.split('/')[1]?.replace('quicktime', 'mov').replace('jpeg', 'jpg') ?? 'bin';
    path = `${userId}/${Date.now()}.${ext}`;
    const bytes = await new File(media.uri).arrayBuffer();
    const { error: upErr } = await supabase.storage
      .from('media')
      .upload(path, bytes, { contentType: media.mimeType, upsert: false });
    if (upErr) throw upErr;
  }
  const { data, error } = await supabase
    .from('posts')
    .insert({
      body: body.trim(),
      media_type: media?.type ?? null,
      media_path: path,
      media_width: media?.width ?? null,
      media_height: media?.height ?? null,
      coin_id: coinId ?? null,
    })
    .select('id')
    .single();
  if (error) {
    if (path) await supabase.storage.from('media').remove([path]);
    throw error;
  }
  return data.id as string;
}

export async function deletePost(post: Post) {
  const { error } = await supabase.from('posts').delete().eq('id', post.id);
  if (error) throw error;
  if (post.mediaPath) await supabase.storage.from('media').remove([post.mediaPath]);
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data } = await supabase
    .from('comment_feed')
    .select('id, post_id, user_id, username, body, created_at')
    .eq('post_id', postId)
    .order('id', { ascending: true })
    .limit(200);
  return (data ?? []).map((r) => ({
    id: r.id,
    postId: r.post_id,
    userId: r.user_id,
    username: r.username,
    body: r.body,
    createdAt: Date.parse(r.created_at),
  }));
}

export async function addComment(postId: string, body: string) {
  const { error } = await supabase.from('post_comments').insert({ post_id: postId, body: body.trim() });
  if (error) throw error;
}

export async function deleteComment(id: number) {
  const { error } = await supabase.from('post_comments').delete().eq('id', id);
  if (error) throw error;
}
