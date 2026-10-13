# Callout Pro — subscription setup (no RevenueCat, no monthly fees)

How it works: the app takes the payment through **Google Play Billing**. After a
purchase it sends the purchase token to the `billing` Edge Function, which asks
Google if it is really paid, writes the `subscriptions` table with the service
key and acknowledges the purchase. The app reads Pro status from that table
(live through Realtime). Clients can never write it.

Costs: Play Console account US$25 once; Google keeps 15% of subscription revenue.
Nothing else.

## 1. Database
Run `supabase/006_subscriptions.sql` in Supabase → SQL Editor (safe to re-run).

## 2. Play Console
1. Create the developer account and the app `com.henriquest.callout`.
2. Upload a build (internal testing track) — products only appear after the first upload.
3. Monetize → Subscriptions → Create subscription: product ID **`callout_pro`**,
   base plan monthly (auto-renewing), price ~US$5 (set per-country prices).
4. Setup → License testing: add your Gmail so test purchases are free.

## 3. Google service account (lets the server verify purchases)
1. Google Cloud Console → create a project → enable **Google Play Android Developer API**.
2. IAM → Service accounts → create one → Keys → Add key → JSON (download it).
3. Play Console → Users and permissions → Invite the service account e-mail with
   *View financial data* and *Manage orders and subscriptions*.

## 4. Edge Function
Supabase → Edge Functions → Deploy a new function named **`billing`** → paste
`supabase/functions/billing/index.ts`. Keep "Verify JWT" on.
Then Edge Functions → Secrets:
- `GOOGLE_SERVICE_ACCOUNT_JSON` = the full contents of the JSON key
- `ANDROID_PACKAGE_NAME` = `com.henriquest.callout` (optional)
- `PRO_PRODUCT_ID` = `callout_pro` (optional)

Never put that JSON, or the service-role key, in the app or in git.

## 5. Renewals and cancellations
The app re-verifies when it opens and after each purchase event. Pro access
stays until `expires_at`, so a missed renewal check only matters when the user
never opens the app again. (Optional later: Google real-time notifications.)
