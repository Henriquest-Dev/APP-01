import type { LiveProvider, ParsedLive } from './live-link';
import { supabase } from './supabase';

export * from './live-link';

export type Live = {
  id: string;
  userId: string;
  username: string;
  handle: string;
  provider: LiveProvider;
  ref: string;
  url: string;
  title: string;
  startedAt: number;
};

const COLUMNS = 'id, user_id, username, handle, provider, ref, url, title, started_at';

function toLive(r: any): Live {
  return {
    id: r.id,
    userId: r.user_id,
    username: r.username ?? '',
    handle: r.handle ?? '',
    provider: r.provider,
    ref: r.ref ?? '',
    url: r.url,
    title: r.title,
    startedAt: Date.parse(r.started_at),
  };
}

export async function fetchLives(): Promise<Live[]> {
  const { data } = await supabase
    .from('live_feed')
    .select(COLUMNS)
    .order('started_at', { ascending: false })
    .limit(50);
  return (data ?? []).map(toLive);
}

export async function fetchLive(id: string): Promise<Live | null> {
  const { data } = await supabase.from('live_feed').select(COLUMNS).eq('id', id).maybeSingle();
  return data ? toLive(data) : null;
}

export async function startLive(parsed: ParsedLive, title: string): Promise<'ok' | 'already' | 'error'> {
  const { error } = await supabase
    .from('lives')
    .insert({ provider: parsed.provider, ref: parsed.ref, url: parsed.url, title: title.trim() });
  if (!error) return 'ok';
  return error.code === '23505' ? 'already' : 'error';
}

export async function endLive(id: string): Promise<boolean> {
  const { error } = await supabase.from('lives').update({ ended_at: new Date().toISOString() }).eq('id', id);
  return !error;
}
