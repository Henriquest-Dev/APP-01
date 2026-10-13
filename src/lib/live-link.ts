// Pure helpers (no network): parse a pasted live link and build its embed.

export type LiveProvider = 'youtube' | 'twitch' | 'kick' | 'other';

export type ParsedLive = { provider: LiveProvider; ref: string; url: string };

export const PROVIDER_NAMES: Record<LiveProvider, string> = {
  youtube: 'YouTube',
  twitch: 'Twitch',
  kick: 'Kick',
  other: '',
};

/** Platforms accepted (kept in sync with the lives_url_allowed check in 008_lives.sql). */
const ALLOWED = [
  'youtube.com',
  'youtu.be',
  'twitch.tv',
  'kick.com',
  'tiktok.com',
  'instagram.com',
  'facebook.com',
  'fb.watch',
  'x.com',
  'twitter.com',
  'rumble.com',
  'trovo.live',
];

const onHost = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

export type ParseError = 'invalid' | 'unsupported' | 'needsVideoLink';

/**
 * Turns a pasted link into something we can embed (YouTube, Twitch, Kick) or
 * open in the platform's own app (everything else on the allowlist).
 */
export function parseLiveUrl(input: string): ParsedLive | ParseError {
  let u: URL;
  try {
    u = new URL(input.trim().startsWith('http') ? input.trim() : `https://${input.trim()}`);
  } catch {
    return 'invalid';
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return 'invalid';
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (!ALLOWED.some((d) => onHost(host, d))) return 'unsupported';
  const clean = `https://${u.hostname.toLowerCase()}${u.pathname}${u.search}`.slice(0, 300);

  const segments = u.pathname.split('/').filter(Boolean);

  if (onHost(host, 'youtu.be') || onHost(host, 'youtube.com')) {
    const id = onHost(host, 'youtu.be')
      ? segments[0]
      : u.searchParams.get('v') ||
        (['live', 'embed', 'shorts'].includes(segments[0] ?? '') ? segments[1] : undefined);
    if (id && /^[A-Za-z0-9_-]{11}$/.test(id))
      return { provider: 'youtube', ref: id, url: `https://www.youtube.com/watch?v=${id}` };
    // e.g. youtube.com/@channel/live: valid, but cannot be embedded.
    return segments.length ? { provider: 'other', ref: '', url: clean } : 'needsVideoLink';
  }

  if (onHost(host, 'twitch.tv')) {
    const name = segments[0]?.toLowerCase();
    if (name && /^[a-z0-9_]{3,25}$/.test(name) && !['videos', 'directory', 'downloads'].includes(name))
      return { provider: 'twitch', ref: name, url: `https://www.twitch.tv/${name}` };
    return 'invalid';
  }

  if (onHost(host, 'kick.com')) {
    const name = segments[0]?.toLowerCase();
    if (name && /^[a-z0-9_]{3,25}$/.test(name))
      return { provider: 'kick', ref: name, url: `https://kick.com/${name}` };
    return 'invalid';
  }

  return { provider: 'other', ref: '', url: clean };
}

/** Same origin we declare as the page that hosts the embed (Twitch requires a `parent`). */
export const EMBED_ORIGIN = 'https://callout.app';
export const EMBED_PARENT = 'callout.app';

export function embedSrc(live: { provider: LiveProvider; ref: string }): string | null {
  switch (live.provider) {
    case 'youtube':
      return `https://www.youtube.com/embed/${live.ref}?autoplay=1&playsinline=1&rel=0&modestbranding=1`;
    case 'twitch':
      return `https://player.twitch.tv/?channel=${live.ref}&parent=${EMBED_PARENT}&autoplay=true`;
    case 'kick':
      return `https://player.kick.com/${live.ref}`;
    default:
      return null;
  }
}

export function embedHtml(src: string): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%}</style></head><body><iframe src="${src}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe></body></html>`;
}
