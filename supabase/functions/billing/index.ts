// Callout Pro billing — Supabase Edge Function (Deno). Free replacement for RevenueCat.
//
// The app buys through Google Play, then sends the purchase token here. We ask
// Google (Play Developer API, subscriptionsv2) whether it is really paid, write
// the result with the service key, and acknowledge the purchase so Google does
// not refund it after 3 days. Clients can never write the subscriptions table.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   GOOGLE_SERVICE_ACCOUNT_JSON  full JSON of the Google Cloud service account key
//   ANDROID_PACKAGE_NAME         optional, defaults to com.henriquest.callout
//   PRO_PRODUCT_ID               optional, defaults to callout_pro
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase itself.

export type Json = Record<string, unknown>;

export type Deps = {
  /** Resolves the user id behind the caller's JWT, or null. */
  getUserId: (jwt: string) => Promise<string | null>;
  /** Google subscriptionsv2.get */
  getSubscription: (token: string) => Promise<Json | null>;
  acknowledge: (productId: string, token: string) => Promise<void>;
  /** Owner of a purchase token, if already stored. */
  tokenOwner: (token: string) => Promise<string | null>;
  upsertSubscription: (row: Json) => Promise<void>;
  logEvent: (userId: string | null, kind: string, detail: Json) => Promise<void>;
  now: () => number;
  productId: string;
};

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, apikey, x-client-info',
};

function reply(status: number, body: Json): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

/** Maps Google's subscriptionState to our states. */
export function mapState(googleState: string | undefined): string {
  switch (googleState) {
    case 'SUBSCRIPTION_STATE_ACTIVE':
      return 'active';
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
      return 'grace';
    case 'SUBSCRIPTION_STATE_CANCELED':
      return 'canceled';
    case 'SUBSCRIPTION_STATE_ON_HOLD':
      return 'on_hold';
    case 'SUBSCRIPTION_STATE_PAUSED':
      return 'paused';
    case 'SUBSCRIPTION_STATE_PENDING':
    case 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED':
      return 'pending';
    case 'SUBSCRIPTION_STATE_EXPIRED':
      return 'expired';
    default:
      return 'expired';
  }
}

export async function handle(req: Request, deps: Deps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const userId = jwt ? await deps.getUserId(jwt) : null;
  if (!userId) return reply(401, { error: 'not_signed_in' });

  let body: { purchaseToken?: unknown };
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: 'bad_request' });
  }
  const token = typeof body.purchaseToken === 'string' ? body.purchaseToken : '';
  if (token.length < 20 || token.length > 4096) return reply(400, { error: 'bad_token' });

  // A token can only ever belong to one account (blocks sharing one purchase).
  const owner = await deps.tokenOwner(token);
  if (owner && owner !== userId) {
    await deps.logEvent(userId, 'token_belongs_to_other_user', {});
    return reply(409, { error: 'token_in_use' });
  }

  const sub = await deps.getSubscription(token);
  if (!sub) {
    await deps.logEvent(userId, 'google_rejected', {});
    return reply(422, { error: 'not_found_at_google' });
  }

  const lines = (sub.lineItems as Json[] | undefined) ?? [];
  const line = lines.find((l) => l.productId === deps.productId);
  if (!line) {
    await deps.logEvent(userId, 'wrong_product', { products: lines.map((l) => l.productId) });
    return reply(422, { error: 'wrong_product' });
  }

  const state = mapState(sub.subscriptionState as string | undefined);
  const expiresAt = typeof line.expiryTime === 'string' ? line.expiryTime : null;
  const autoRenewing = Boolean((line.autoRenewingPlan as Json | undefined)?.autoRenewEnabled);
  const ack = sub.acknowledgementState as string | undefined;

  // Paid states get acknowledged (otherwise Google refunds after 3 days).
  if (ack === 'ACKNOWLEDGEMENT_STATE_PENDING' && ['active', 'grace', 'canceled'].includes(state)) {
    await deps.acknowledge(deps.productId, token);
  }

  await deps.upsertSubscription({
    user_id: userId,
    product_id: deps.productId,
    purchase_token: token,
    state,
    auto_renewing: autoRenewing,
    started_at: typeof sub.startTime === 'string' ? sub.startTime : null,
    expires_at: expiresAt,
    test_purchase: sub.testPurchase !== undefined,
    updated_at: new Date(deps.now()).toISOString(),
  });
  await deps.logEvent(userId, 'verified', { state, expiresAt });

  const pro = ['active', 'grace', 'canceled'].includes(state) && !!expiresAt && Date.parse(expiresAt) > deps.now();
  return reply(200, { pro, state, expiresAt });
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

async function googleAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const iat = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/androidpublisher',
      aud: 'https://oauth2.googleapis.com/token',
      iat,
      exp: iat + 3600,
    }),
  );
  const pem = String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
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
  const env = (k: string) => Deno.env.get(k) as string | undefined;
  const url = env('SUPABASE_URL')!;
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')!;
  const pkg = env('ANDROID_PACKAGE_NAME') ?? 'com.henriquest.callout';
  const productId = env('PRO_PRODUCT_ID') ?? 'callout_pro';
  const rest = (path: string, init: RequestInit = {}) =>
    fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        'content-type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
  let cached: { token: string; at: number } | null = null;
  const access = async () => {
    if (!cached || Date.now() - cached.at > 45 * 60_000) {
      cached = { token: await googleAccessToken(env('GOOGLE_SERVICE_ACCOUNT_JSON')!), at: Date.now() };
    }
    return cached.token;
  };

  const deps: Deps = {
    productId,
    now: () => Date.now(),
    getUserId: async (jwt) => {
      const res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: serviceKey, authorization: `Bearer ${jwt}` } });
      return res.ok ? ((await res.json()).id as string) : null;
    },
    getSubscription: async (token) => {
      const res = await fetch(
        `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`,
        { headers: { authorization: `Bearer ${await access()}` } },
      );
      return res.ok ? ((await res.json()) as Json) : null;
    },
    acknowledge: async (sku, token) => {
      await fetch(
        `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/purchases/subscriptions/${sku}/tokens/${encodeURIComponent(token)}:acknowledge`,
        { method: 'POST', headers: { authorization: `Bearer ${await access()}`, 'content-type': 'application/json' }, body: '{}' },
      );
    },
    tokenOwner: async (token) => {
      const res = await rest(`subscriptions?select=user_id&purchase_token=eq.${encodeURIComponent(token)}`);
      const rows = res.ok ? await res.json() : [];
      return rows[0]?.user_id ?? null;
    },
    upsertSubscription: async (row) => {
      const res = await rest('subscriptions?on_conflict=user_id', {
        method: 'POST',
        headers: { prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(row),
      });
      if (!res.ok) throw new Error(`db_${res.status}`);
    },
    logEvent: async (userId, kind, detail) => {
      await rest('billing_events', { method: 'POST', body: JSON.stringify({ user_id: userId, kind, detail }) });
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
