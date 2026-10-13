import { Platform } from 'react-native';

import { supabase } from './supabase';

/** Product created in Play Console → Monetize → Subscriptions. */
export const PRO_PRODUCT_ID = 'callout_pro';

export type ProStatus = { pro: boolean; expiresAt: string | null; autoRenewing: boolean; state: string | null };

export const NOT_PRO: ProStatus = { pro: false, expiresAt: null, autoRenewing: false, state: null };

/** Billing exists on Android only for now (Google Play). */
export const billingAvailable = Platform.OS === 'android';

export async function fetchProStatus(userId: string): Promise<ProStatus> {
  const { data } = await supabase
    .from('subscriptions')
    .select('state, expires_at, auto_renewing')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return NOT_PRO;
  const live = ['active', 'grace', 'canceled'].includes(data.state);
  const pro = live && !!data.expires_at && Date.parse(data.expires_at) > Date.now();
  return { pro, expiresAt: data.expires_at, autoRenewing: data.auto_renewing, state: data.state };
}

/** Asks the server to confirm a Google Play purchase token. Throws when it cannot. */
export async function verifyOnServer(purchaseToken: string): Promise<ProStatus> {
  const { data, error } = await supabase.functions.invoke('billing', { body: { purchaseToken } });
  if (error) throw error;
  return { pro: !!data.pro, expiresAt: data.expiresAt ?? null, autoRenewing: false, state: data.state ?? null };
}

// Loaded lazily so the web preview (and tests) never touch the native module.
function iap(): typeof import('expo-iap') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-iap');
}

export type ProPlan = { sku: string; price: string; offerToken: string | null };

export async function connect(): Promise<void> {
  await iap().initConnection();
}

export async function loadPlan(): Promise<ProPlan | null> {
  const products = (await iap().fetchProducts({ skus: [PRO_PRODUCT_ID], type: 'subs' })) ?? [];
  const p = products[0] as
    | { subscriptionOffers?: { displayPrice: string; offerTokenAndroid?: string | null }[]; displayPrice?: string }
    | undefined;
  if (!p) return null;
  const offer = p.subscriptionOffers?.[0];
  return {
    sku: PRO_PRODUCT_ID,
    price: offer?.displayPrice ?? p.displayPrice ?? '',
    offerToken: offer?.offerTokenAndroid ?? null,
  };
}

/** Opens Google's purchase sheet; the result arrives through `listen`. */
export async function startPurchase(plan: ProPlan, userId: string): Promise<void> {
  await iap().requestPurchase({
    type: 'subs',
    request: {
      google: {
        skus: [plan.sku],
        obfuscatedAccountId: userId,
        subscriptionOffers: plan.offerToken ? [{ sku: plan.sku, offerToken: plan.offerToken }] : undefined,
      },
    },
  });
}

/**
 * Handles every purchase Google reports (new, restored, renewed): confirm it on
 * the server first, and only then finish the transaction.
 */
export function listen(onVerified: (s: ProStatus) => void, onError: (cancelled: boolean) => void) {
  const m = iap();
  const updates = m.purchaseUpdatedListener(async (purchase) => {
    try {
      if (purchase.productId !== PRO_PRODUCT_ID || !purchase.purchaseToken) return;
      const status = await verifyOnServer(purchase.purchaseToken);
      if (status.pro) await m.finishTransaction({ purchase, isConsumable: false });
      onVerified(status);
    } catch {
      onError(false);
    }
  });
  const errors = m.purchaseErrorListener((e) => onError(m.isUserCancelledError(e)));
  return () => {
    updates.remove();
    errors.remove();
  };
}

/** Re-checks purchases Google already has for this account (new phone, reinstall). */
export async function restore(): Promise<ProStatus | null> {
  const m = iap();
  const owned = await m.getAvailablePurchases();
  const mine = owned.find((p) => p.productId === PRO_PRODUCT_ID && p.purchaseToken);
  return mine?.purchaseToken ? verifyOnServer(mine.purchaseToken) : null;
}

export async function manageSubscription(): Promise<void> {
  await iap().deepLinkToSubscriptions({ skuAndroid: PRO_PRODUCT_ID, packageNameAndroid: 'com.henriquest.callout' });
}
