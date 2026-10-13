import type { Call } from './types';

/** Hit rate over resolved calls and the current run of consecutive hits. */
export function callStats(calls: Call[]) {
  const resolved = calls
    .filter((c) => c.status === 'hit' || c.status === 'miss')
    .sort((a, b) => b.expiresAt - a.expiresAt);
  const hits = resolved.filter((c) => c.status === 'hit').length;
  let streak = 0;
  for (const c of resolved) {
    if (c.status !== 'hit') break;
    streak++;
  }
  return {
    total: calls.length,
    resolved: resolved.length,
    hitRate: resolved.length ? Math.round((hits / resolved.length) * 100) : null,
    streak,
  };
}
