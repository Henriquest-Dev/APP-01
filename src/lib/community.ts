import { supabase } from './supabase';
import type { CallStatus, Direction, Timeframe } from './types';

export const GENERAL_GROUP_ID = '00000000-0000-0000-0000-00000000c0de';

export type FeedCall = {
  id: string;
  userId: string;
  username: string;
  coinId: string;
  symbol: string;
  name: string;
  image: string;
  direction: Direction;
  entryPrice: number;
  targetPrice?: number;
  timeframe: Timeframe;
  note?: string;
  status: CallStatus;
  exitPrice?: number;
  createdAt: number;
  expiresAt: number;
};

export type Group = {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  inviteCode: string;
  ownerId: string | null;
  memberCount: number;
  lastMessageAt: number | null;
};

export type Message = {
  id: number;
  groupId: string;
  userId: string;
  username: string;
  body: string;
  callId: string | null;
  createdAt: number;
};

export const FEED_COLUMNS =
  'id, user_id, username, coin_id, symbol, name, image, direction, entry_price, target_price, timeframe, note, status, exit_price, created_at, expires_at';

export function toFeedCall(r: any): FeedCall {
  return {
    id: r.id,
    userId: r.user_id,
    username: r.username ?? '',
    coinId: r.coin_id,
    symbol: r.symbol,
    name: r.name,
    image: r.image ?? '',
    direction: r.direction,
    entryPrice: Number(r.entry_price),
    targetPrice: r.target_price == null ? undefined : Number(r.target_price),
    timeframe: r.timeframe,
    note: r.note ?? undefined,
    status: r.status,
    exitPrice: r.exit_price == null ? undefined : Number(r.exit_price),
    createdAt: Date.parse(r.created_at),
    expiresAt: Date.parse(r.expires_at),
  };
}

function toGroup(r: any): Group {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    isPublic: r.is_public,
    inviteCode: r.invite_code,
    ownerId: r.owner_id,
    memberCount: r.member_count ?? 0,
    lastMessageAt: r.last_message_at ? Date.parse(r.last_message_at) : null,
  };
}

export async function fetchFeed(opts: { userId?: string; coinId?: string; limit?: number } = {}) {
  let q = supabase.from('call_feed').select(FEED_COLUMNS).order('created_at', { ascending: false });
  if (opts.userId) q = q.eq('user_id', opts.userId);
  if (opts.coinId) q = q.eq('coin_id', opts.coinId);
  const { data } = await q.limit(opts.limit ?? 50);
  return (data ?? []).map(toFeedCall);
}

/** Fills in the caller's name for a raw `calls` row arriving over Realtime. */
export async function hydrateFeedCall(id: string): Promise<FeedCall | null> {
  const { data } = await supabase.from('call_feed').select(FEED_COLUMNS).eq('id', id).maybeSingle();
  return data ? toFeedCall(data) : null;
}

export async function fetchGroups(userId: string | undefined) {
  const [{ data: all }, { data: mine }] = await Promise.all([
    supabase
      .from('group_list')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(100),
    userId
      ? supabase.from('group_members').select('group_id').eq('user_id', userId)
      : Promise.resolve({ data: [] as { group_id: string }[] }),
  ]);
  const memberOf = new Set((mine ?? []).map((m) => m.group_id));
  const groups = (all ?? []).map(toGroup);
  return {
    mine: groups.filter((g) => memberOf.has(g.id)),
    discover: groups.filter((g) => !memberOf.has(g.id) && g.isPublic),
  };
}

export async function fetchGroup(id: string) {
  const { data } = await supabase.from('group_list').select('*').eq('id', id).maybeSingle();
  return data ? toGroup(data) : null;
}

export async function isMember(groupId: string, userId: string) {
  const { data } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

export async function createGroup(name: string, description: string, isPublic: boolean) {
  const { data, error } = await supabase
    .from('groups')
    .insert({ name: name.trim(), description: description.trim() || null, is_public: isPublic })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function joinGroup(groupId: string, userId: string) {
  const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: userId });
  if (error && !error.message.includes('duplicate')) throw error;
}

export async function joinGroupByCode(code: string) {
  const { data, error } = await supabase.rpc('join_group_by_code', { code });
  if (error) throw error;
  return data as string;
}

export async function leaveGroup(groupId: string, userId: string) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function fetchUsernames(ids: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return {};
  const { data } = await supabase.from('profiles').select('id, username').in('id', unique);
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.username]));
}

export async function fetchMessages(groupId: string, limit = 60): Promise<Message[]> {
  const { data } = await supabase
    .from('messages')
    .select('id, group_id, user_id, body, call_id, created_at, profiles(username)')
    .eq('group_id', groupId)
    .order('id', { ascending: false })
    .limit(limit);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    groupId: r.group_id,
    userId: r.user_id,
    username: r.profiles?.username ?? '',
    body: r.body,
    callId: r.call_id,
    createdAt: Date.parse(r.created_at),
  }));
}

export async function sendMessage(groupId: string, body: string, callId?: string) {
  const { error } = await supabase
    .from('messages')
    .insert({ group_id: groupId, body, call_id: callId ?? null });
  if (error) throw error;
}

export async function fetchCallsByIds(ids: string[]): Promise<Record<string, FeedCall>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return {};
  const { data } = await supabase.from('call_feed').select(FEED_COLUMNS).in('id', unique);
  return Object.fromEntries((data ?? []).map((r) => [r.id, toFeedCall(r)]));
}
