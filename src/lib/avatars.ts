import { useEffect, useSyncExternalStore } from 'react';

import { mediaUrl } from './posts';
import { supabase } from './supabase';

/**
 * Profile photos, fetched in small batches and shared by every list on screen
 * (posts, calls, chat, search...), so a feed of 40 items costs one request.
 * `undefined` = not loaded yet, `null` = no photo.
 */
const cache = new Map<string, string | null>();
const listeners = new Set<() => void>();
const wanted = new Set<string>();
let timer: ReturnType<typeof setTimeout> | undefined;
let serverReady = true;

function emit() {
  for (const l of listeners) l();
}

async function flush() {
  timer = undefined;
  const ids = [...wanted].slice(0, 100);
  for (const id of ids) wanted.delete(id);
  if (!ids.length) return;
  if (!serverReady) {
    for (const id of ids) cache.set(id, null);
    emit();
    return;
  }
  const { data, error } = await supabase.from('profiles').select('id, avatar_path').in('id', ids);
  if (error) serverReady = false; // server without the profile SQL: stop asking
  const found = new Map((data ?? []).map((r) => [r.id as string, mediaUrl(r.avatar_path ?? null)]));
  for (const id of ids) cache.set(id, found.get(id) ?? null);
  emit();
  if (wanted.size) timer = setTimeout(flush, 30);
}

export function requestAvatar(id: string) {
  if (!id || cache.has(id) || wanted.has(id)) return;
  wanted.add(id);
  timer ??= setTimeout(flush, 60);
}

/** After changing my own photo, so every list updates at once. */
export function setAvatarCache(id: string, url: string | null) {
  cache.set(id, url);
  emit();
}

export function useAvatar(userId: string | undefined): string | null | undefined {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => (userId ? cache.get(userId) : null),
  );
  useEffect(() => {
    if (userId) requestAvatar(userId);
  }, [userId]);
  return value;
}
