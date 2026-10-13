import { supabase } from './supabase';

export type ReportTarget = 'post' | 'comment' | 'message' | 'user' | 'call';

export async function report(targetType: ReportTarget, targetId: string, reason?: string) {
  const { error } = await supabase
    .from('reports')
    .insert({ target_type: targetType, target_id: targetId, reason: reason ?? null });
  if (error) throw error;
}

export async function fetchBlocked(): Promise<{ id: string; username: string }[]> {
  const { data } = await supabase
    .from('blocks')
    .select('blocked_id, profiles!blocks_blocked_id_fkey(username)');
  return (data ?? []).map((r: any) => ({ id: r.blocked_id, username: r.profiles?.username ?? '' }));
}

export async function block(userId: string) {
  const { error } = await supabase.from('blocks').insert({ blocked_id: userId });
  if (error && !error.message.includes('duplicate')) throw error;
}

export async function unblock(userId: string) {
  const { error } = await supabase.from('blocks').delete().eq('blocked_id', userId);
  if (error) throw error;
}
