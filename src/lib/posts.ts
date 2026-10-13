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
  repostCount: number;
  viewCount: number;
  /** Set when the feed entry is someone's repost of this post. */
  repostedBy?: { id: string; username: string };
  /** When this entry should sort in the feed (repost time or post time). */
  sortAt: number;
};

export type PostFlags = { liked: Set<string>; reposted: Set<string>; saved: Set<string> };

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
  'id, user_id, username, body, media_type, media_path, media_width, media_height, coin_id, created_at, like_count, comment_count, repost_count, view_count';

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
    repostCount: r.repost_count ?? 0,
    viewCount: r.view_count ?? 0,
    repostedBy: r.reposter_id ? { id: r.reposter_id, username: r.reposter_name ?? '' } : undefined,
    sortAt: Date.parse(r.reposted_at ?? r.created_at),
  };
}

/** Original posts plus reposts ("X reposted"), newest activity first, one entry per post. */
export async function fetchPosts(opts: { userId?: string; limit?: number } = {}) {
  const limit = opts.limit ?? 40;
  let originals = supabase.from('post_feed').select(POST_COLUMNS).order('created_at', { ascending: false });
  let reposts = supabase
    .from('repost_feed')
    .select(`${POST_COLUMNS}, reposted_at, reposter_id, reposter_name`)
    .order('reposted_at', { ascending: false });
  if (opts.userId) {
    originals = originals.eq('user_id', opts.userId);
    reposts = reposts.eq('reposter_id', opts.userId);
  }
  const [o, r] = await Promise.all([originals.limit(limit), reposts.limit(limit)]);
  const byId = new Map<string, Post>();
  for (const post of [...(o.data ?? []), ...(r.data ?? [])].map(toPost)) {
    const prev = byId.get(post.id);
    if (!prev || post.sortAt > prev.sortAt) byId.set(post.id, post);
  }
  return [...byId.values()].sort((a, b) => b.sortAt - a.sortAt).slice(0, limit);
}

export async function fetchPost(id: string) {
  const { data } = await supabase.from('post_feed').select(POST_COLUMNS).eq('id', id).maybeSingle();
  return data ? toPost(data) : null;
}

export async function fetchMyFlags(userId: string, postIds: string[]): Promise<PostFlags> {
  const flags: PostFlags = { liked: new Set(), reposted: new Set(), saved: new Set() };
  if (!postIds.length) return flags;
  const [l, r, b] = await Promise.all([
    supabase.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', postIds),
    supabase.from('post_reposts').select('post_id').eq('user_id', userId).in('post_id', postIds),
    supabase.from('post_bookmarks').select('post_id').eq('user_id', userId).in('post_id', postIds),
  ]);
  for (const x of l.data ?? []) flags.liked.add(x.post_id);
  for (const x of r.data ?? []) flags.reposted.add(x.post_id);
  for (const x of b.data ?? []) flags.saved.add(x.post_id);
  return flags;
}

export async function fetchMyLikes(userId: string, postIds: string[]) {
  return (await fetchMyFlags(userId, postIds)).liked;
}

async function toggle(
  table: 'post_likes' | 'post_reposts' | 'post_bookmarks',
  postId: string,
  on: boolean,
  userId: string,
) {
  const { error } = on
    ? await supabase.from(table).insert({ post_id: postId })
    : await supabase.from(table).delete().eq('post_id', postId).eq('user_id', userId);
  if (error && !error.message.includes('duplicate')) throw error;
}

export const setLike = (postId: string, on: boolean, userId: string) =>
  toggle('post_likes', postId, on, userId);
export const setRepost = (postId: string, on: boolean, userId: string) =>
  toggle('post_reposts', postId, on, userId);
export const setBookmark = (postId: string, on: boolean, userId: string) =>
  toggle('post_bookmarks', postId, on, userId);

const seenThisSession = new Set<string>();

/** Counts one view per person per post; the server dedupes, this just avoids repeat calls. */
export async function recordView(postId: string) {
  if (seenThisSession.has(postId)) return;
  seenThisSession.add(postId);
  await supabase.rpc('record_post_view', { p: postId });
}

export async function fetchSavedPosts(limit = 60): Promise<Post[]> {
  const { data } = await supabase
    .from('bookmark_feed')
    .select(`${POST_COLUMNS}, saved_at`)
    .order('saved_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map(toPost);
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
