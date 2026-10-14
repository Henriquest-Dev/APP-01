import { mediaUrl } from './posts';
import { supabase } from './supabase';

export type ProfileCard = {
  id: string;
  username: string;
  handle: string;
  bio: string;
  createdAt: number;
  followers: number;
  following: number;
  callsTotal: number;
  callsResolved: number;
  callsHits: number;
  pro: boolean;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bannerColor: string | null;
  location: string;
  website: string;
};

const BASE_CARD =
  'id, username, handle, bio, created_at, follower_count, following_count, calls_total, calls_resolved, calls_hits, pro';
const CARD = `${BASE_CARD}, avatar_path, banner_path, banner_color, location, website`;

function toCard(r: any): ProfileCard {
  return {
    id: r.id,
    username: r.username,
    handle: r.handle,
    bio: r.bio ?? '',
    createdAt: Date.parse(r.created_at),
    followers: r.follower_count ?? 0,
    following: r.following_count ?? 0,
    callsTotal: r.calls_total ?? 0,
    callsResolved: r.calls_resolved ?? 0,
    callsHits: r.calls_hits ?? 0,
    pro: !!r.pro,
    avatarUrl: mediaUrl(r.avatar_path ?? null),
    bannerUrl: mediaUrl(r.banner_path ?? null),
    bannerColor: r.banner_color ?? null,
    location: r.location ?? '',
    website: r.website ?? '',
  };
}

export async function fetchCard(id: string): Promise<ProfileCard | null> {
  const full = await supabase.from('profile_cards').select(CARD).eq('id', id).maybeSingle();
  if (!full.error) return full.data ? toCard(full.data) : null;
  // Server without the profile-customisation SQL yet: fall back to the basic card.
  const base = await supabase.from('profile_cards').select(BASE_CARD).eq('id', id).maybeSingle();
  return base.data ? toCard(base.data) : null;
}

/** Finds people by @handle or name. */
export async function searchProfiles(query: string): Promise<ProfileCard[]> {
  const q = query.replace(/^@/, '').replace(/[^\p{L}\p{N}_ ]/gu, '').trim();
  if (q.length < 2) return [];
  const { data } = await supabase
    .from('profile_cards')
    .select(BASE_CARD)
    .or(`handle.ilike.${q.toLowerCase().replace(/ /g, '')}%,username.ilike.%${q}%`)
    .order('follower_count', { ascending: false })
    .limit(25);
  return (data ?? []).map(toCard);
}

export async function isFollowing(me: string, other: string): Promise<boolean> {
  const { data } = await supabase
    .from('follows')
    .select('followee_id')
    .eq('follower_id', me)
    .eq('followee_id', other)
    .maybeSingle();
  return !!data;
}

export async function setFollow(me: string, other: string, on: boolean) {
  const { error } = on
    ? await supabase.from('follows').insert({ followee_id: other })
    : await supabase.from('follows').delete().eq('follower_id', me).eq('followee_id', other);
  // Following twice is harmless.
  if (error && error.code !== '23505') throw error;
}

export type HandleResult = 'ok' | 'invalid' | 'taken' | 'error';

export const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

export async function updateHandle(raw: string): Promise<HandleResult> {
  const handle = raw.trim().replace(/^@/, '').toLowerCase();
  if (!HANDLE_RE.test(handle)) return 'invalid';
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return 'error';
  const { error } = await supabase.from('profiles').update({ handle }).eq('id', auth.user.id);
  if (!error) return 'ok';
  return error.code === '23505' ? 'taken' : 'error';
}

export async function updateBio(bio: string): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { error } = await supabase
    .from('profiles')
    .update({ bio: bio.trim() || null })
    .eq('id', auth.user.id);
  return !error;
}
