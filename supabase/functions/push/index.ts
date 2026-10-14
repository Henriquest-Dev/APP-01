// Callout push sender — Supabase Edge Function (Deno).
//
// Woken every minute by the database (public.push_pending) when notifications
// are waiting. Sends them to the phones through Firebase Cloud Messaging (free),
// in each person's language, then marks them as pushed.
//
// Deploy with "Verify JWT" OFF: the caller proves itself with the private
// header x-push-secret, which must equal app_secrets.push_secret.
// Private settings (public.app_secrets): push_secret, firebase_service_account (JSON).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase itself.

export type Json = Record<string, unknown>;

export type Note = { id: number; user_id: string; kind: string; data: Json };
export type TokenRow = { token: string; user_id: string; lang: string };

export type Deps = {
  secret: () => Promise<string | null>;
  pending: (limit: number) => Promise<Note[]>;
  tokensFor: (userIds: string[]) => Promise<TokenRow[]>;
  send: (token: string, msg: { title: string; body: string; data: Record<string, string> }) => Promise<'ok' | 'invalid' | 'error'>;
  deleteTokens: (tokens: string[]) => Promise<void>;
  markPushed: (ids: number[]) => Promise<void>;
};

type Template = { title: string; body: string };
type Kind = 'call_hit' | 'call_miss' | 'follow';

// {symbol} and {handle} are filled in; keep each text short (push banners cut long lines).
export const TEXTS: Record<string, Record<Kind, Template>> = {
  en: {
    call_hit: { title: 'Your {symbol} call hit', body: 'The market played out the way you called it. Open Callout to see the result.' },
    call_miss: { title: 'Your {symbol} call missed', body: 'The market went another way this time. See the details in Callout.' },
    follow: { title: 'New follower', body: '@{handle} started following you.' },
  },
  pt: {
    call_hit: { title: 'A tua call em {symbol} acertou', body: 'O mercado foi como previste. Abre o Callout para ver o resultado.' },
    call_miss: { title: 'A tua call em {symbol} falhou', body: 'Desta vez o mercado foi para o outro lado. Vê os detalhes no Callout.' },
    follow: { title: 'Novo seguidor', body: '@{handle} começou a seguir-te.' },
  },
  es: {
    call_hit: { title: 'Tu call de {symbol} acertó', body: 'El mercado fue como lo previste. Abre Callout para ver el resultado.' },
    call_miss: { title: 'Tu call de {symbol} falló', body: 'Esta vez el mercado fue en otra dirección. Mira los detalles en Callout.' },
    follow: { title: 'Nuevo seguidor', body: '@{handle} empezó a seguirte.' },
  },
  fr: {
    call_hit: { title: 'Ton call sur {symbol} a réussi', body: 'Le marché a évolué comme tu l’avais prévu. Ouvre Callout pour le résultat.' },
    call_miss: { title: 'Ton call sur {symbol} a échoué', body: 'Cette fois, le marché est parti dans l’autre sens. Détails dans Callout.' },
    follow: { title: 'Nouvel abonné', body: '@{handle} a commencé à te suivre.' },
  },
  de: {
    call_hit: { title: 'Dein {symbol}-Call lag richtig', body: 'Der Markt ist so gelaufen, wie du es vorhergesagt hast. Ergebnis in Callout.' },
    call_miss: { title: 'Dein {symbol}-Call lag daneben', body: 'Diesmal lief der Markt anders. Details in Callout.' },
    follow: { title: 'Neuer Follower', body: '@{handle} folgt dir jetzt.' },
  },
  it: {
    call_hit: { title: 'La tua call su {symbol} è andata a segno', body: 'Il mercato è andato come previsto. Apri Callout per il risultato.' },
    call_miss: { title: 'La tua call su {symbol} è fallita', body: 'Stavolta il mercato è andato in un’altra direzione. Dettagli in Callout.' },
    follow: { title: 'Nuovo follower', body: '@{handle} ha iniziato a seguirti.' },
  },
  ru: {
    call_hit: { title: 'Твой колл по {symbol} сыграл', body: 'Рынок пошёл так, как ты предсказал. Результат в Callout.' },
    call_miss: { title: 'Твой колл по {symbol} не сыграл', body: 'В этот раз рынок пошёл в другую сторону. Подробности в Callout.' },
    follow: { title: 'Новый подписчик', body: '@{handle} подписался на тебя.' },
  },
  tr: {
    call_hit: { title: '{symbol} call’un tuttu', body: 'Piyasa senin öngördüğün gibi gitti. Sonucu Callout’ta gör.' },
    call_miss: { title: '{symbol} call’un tutmadı', body: 'Bu sefer piyasa başka yöne gitti. Ayrıntılar Callout’ta.' },
    follow: { title: 'Yeni takipçi', body: '@{handle} seni takip etmeye başladı.' },
  },
  zh: {
    call_hit: { title: '你的 {symbol} 预测命中了', body: '市场走势与你的预测一致。打开 Callout 查看结果。' },
    call_miss: { title: '你的 {symbol} 预测未命中', body: '这次市场走向了另一边。在 Callout 查看详情。' },
    follow: { title: '新粉丝', body: '@{handle} 开始关注你了。' },
  },
  hi: {
    call_hit: { title: 'आपकी {symbol} कॉल सही निकली', body: 'बाज़ार वैसा ही चला जैसा आपने कहा था। नतीजा Callout में देखें।' },
    call_miss: { title: 'आपकी {symbol} कॉल चूक गई', body: 'इस बार बाज़ार दूसरी दिशा में गया। Callout में विवरण देखें।' },
    follow: { title: 'नया फ़ॉलोअर', body: '@{handle} ने आपको फ़ॉलो करना शुरू किया।' },
  },
};

const clean = (v: unknown, max = 20) => String(v ?? '').replace(/[^\p{L}\p{N}_.-]/gu, '').slice(0, max);

export function compose(note: Note, lang: string) {
  const set = TEXTS[lang] ?? TEXTS.en;
  const t = set[note.kind as Kind];
  if (!t) return null;
  const fill = (s: string) => s.replace('{symbol}', clean(note.data.symbol) || 'Coin').replace('{handle}', clean(note.data.handle) || '…');
  const data: Record<string, string> = { kind: note.kind, notification_id: String(note.id) };
  if (typeof note.data.coin_id === 'string') data.coin_id = clean(note.data.coin_id, 100);
  if (typeof note.data.follower_id === 'string') data.follower_id = clean(note.data.follower_id, 40);
  return { title: fill(t.title), body: fill(t.body), data };
}

function reply(status: number, body: Json) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function sameSecret(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function handle(req: Request, deps: Deps): Promise<Response> {
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
  const expected = await deps.secret();
  const given = req.headers.get('x-push-secret') ?? '';
  if (!expected || !sameSecret(given, expected)) return reply(401, { error: 'unauthorized' });

  const notes = await deps.pending(100);
  if (!notes.length) return reply(200, { sent: 0 });

  const tokens = await deps.tokensFor([...new Set(notes.map((n) => n.user_id))]);
  const byUser = new Map<string, TokenRow[]>();
  for (const t of tokens) byUser.set(t.user_id, [...(byUser.get(t.user_id) ?? []), t]);

  let sent = 0;
  const dead: string[] = [];
  const retry = new Set<number>();
  for (const note of notes) {
    for (const t of byUser.get(note.user_id) ?? []) {
      const msg = compose(note, t.lang.slice(0, 2).toLowerCase());
      if (!msg) continue;
      const r = await deps.send(t.token, msg);
      if (r === 'ok') sent++;
      else if (r === 'invalid') dead.push(t.token);
      else retry.add(note.id);
    }
  }
  if (dead.length) await deps.deleteTokens([...new Set(dead)]);
  // Done, even for people without a phone token. Temporary failures stay queued
  // and are retried on the next minute (for up to a day).
  const done = notes.filter((n) => !retry.has(n.id)).map((n) => n.id);
  if (done.length) await deps.markPushed(done);
  return reply(200, { sent, notes: notes.length, removed: dead.length });
}

// ---------------------------------------------------------------------------
// Real dependencies (Deno runtime only)
// ---------------------------------------------------------------------------

function b64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function googleAccessToken(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat,
      exp: iat + 3600,
    }),
  );
  const pem = String(serviceAccount.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claim}`));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claim}.${b64url(sig)}`,
    }),
  });
  if (!res.ok) throw new Error(`google_token_${res.status}`);
  return (await res.json()).access_token as string;
}

// deno-lint-ignore no-explicit-any
declare const Deno: any;

if (typeof Deno !== 'undefined' && Deno.serve) {
  const url = Deno.env.get('SUPABASE_URL') as string;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
  const rest = (path: string, init: RequestInit = {}) =>
    fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json', ...(init.headers ?? {}) },
    });
  const setting = async (name: string): Promise<string | null> => {
    const res = await rest(`app_secrets?select=value&name=eq.${name}`);
    return res.ok ? ((await res.json())[0]?.value ?? null) : null;
  };

  let cached: { token: string; project: string; at: number } | null = null;
  const fcm = async () => {
    if (cached && Date.now() - cached.at < 45 * 60_000) return cached;
    const raw = await setting('firebase_service_account');
    if (!raw) throw new Error('no_firebase_key');
    const sa = JSON.parse(raw);
    cached = { token: await googleAccessToken(sa), project: sa.project_id, at: Date.now() };
    return cached;
  };

  const inList = (values: (string | number)[]) => `(${values.map((v) => `"${v}"`).join(',')})`;

  const deps: Deps = {
    secret: () => setting('push_secret'),
    pending: async (limit) => {
      const since = new Date(Date.now() - 24 * 3600_000).toISOString();
      const res = await rest(`notifications?select=id,user_id,kind,data&pushed_at=is.null&created_at=gte.${since}&order=id.asc&limit=${limit}`);
      return res.ok ? await res.json() : [];
    },
    tokensFor: async (userIds) => {
      const res = await rest(`push_tokens?select=token,user_id,lang&user_id=in.${inList(userIds)}`);
      return res.ok ? await res.json() : [];
    },
    send: async (token, msg) => {
      try {
        const { token: access, project } = await fcm();
        const res = await fetch(`https://fcm.googleapis.com/v1/projects/${project}/messages:send`, {
          method: 'POST',
          headers: { authorization: `Bearer ${access}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: msg.title, body: msg.body },
              data: msg.data,
              android: { priority: 'HIGH', notification: { channel_id: 'default', color: '#8B6CFF' } },
            },
          }),
        });
        if (res.ok) return 'ok';
        const err = await res.text();
        console.error('fcm', res.status, err.slice(0, 200));
        return res.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(err) ? 'invalid' : 'error';
      } catch (e) {
        console.error(e);
        return 'error';
      }
    },
    deleteTokens: async (tokens) => {
      await rest(`push_tokens?token=in.${inList(tokens)}`, { method: 'DELETE' });
    },
    markPushed: async (ids) => {
      await rest(`notifications?id=in.(${ids.join(',')})`, {
        method: 'PATCH',
        body: JSON.stringify({ pushed_at: new Date().toISOString() }),
      });
    },
  };

  Deno.serve(async (req: Request) => {
    try {
      return await handle(req, deps);
    } catch (e) {
      console.error(e);
      return reply(500, { error: 'server_error' });
    }
  });
}
