# Callout push notifications — setup (free)

What you get: a notification on the phone when one of your calls is resolved
(hit / miss) and when someone follows you, in the person's language. They also
appear in the in-app inbox (bell on Home), which works even without push.

Cost: nothing. Firebase Cloud Messaging is free.

## 1. Firebase project
1. https://console.firebase.google.com → **Add project** → name it Callout (Analytics can stay off).
2. **Add app → Android**. Package name: `com.henriquest.callout`. Download **google-services.json**.
3. Put `google-services.json` in the repository root (next to `app.json`) and rebuild the app.
   (It is client configuration, not a password. The app builds without it; push just stays off.)

## 2. Service account key (lets the server send)
Firebase → Project settings → **Service accounts** → **Generate new private key** → a JSON file.

## 3. Private settings in Supabase (SQL Editor)
```sql
insert into public.app_secrets (name, value) values
  ('functions_url', 'https://<your-project-ref>.supabase.co/functions/v1'),
  ('push_secret', gen_random_uuid()::text || gen_random_uuid()::text),
  ('firebase_service_account', $json$ <paste the whole JSON file here> $json$)
on conflict (name) do update set value = excluded.value, updated_at = now();
```

## 4. Edge Function
Edge Functions → Deploy a new function named **`push`** → paste
`supabase/functions/push/index.ts` → turn **Verify JWT OFF** (the database
calls it with the private `x-push-secret` header instead) → Deploy.

## Check
Create a call that resolves, or follow someone from another account: within a
minute the other phone gets the notification. Function logs show errors.
