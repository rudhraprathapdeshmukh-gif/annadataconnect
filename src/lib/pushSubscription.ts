import { supabase } from '@/integrations/supabase/client';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

let cachedVapidKey: string | null = null;

async function getVapidPublicKey(): Promise<string | null> {
  if (cachedVapidKey) return cachedVapidKey;
  try {
    const { data, error } = await supabase.functions.invoke('get-vapid-key');
    if (error || !data?.vapidPublicKey) return null;
    cachedVapidKey = data.vapidPublicKey;
    return cachedVapidKey;
  } catch {
    return null;
  }
}

export async function registerServiceWorkerAndSubscribe(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported');
    return;
  }

  const vapidPublicKey = await getVapidPublicKey();
  if (!vapidPublicKey) {
    console.warn('VAPID public key not available');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered');

    const pm = (registration as any).pushManager;
    let subscription = await pm.getSubscription();

    if (!subscription) {
      subscription = await pm.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      console.log('Push subscription created');
    }

    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint!;
    const p256dh = subJson.keys!.p256dh!;
    const auth = subJson.keys!.auth!;

    // Upsert to push_subscriptions table
    const { error } = await supabase
      .from('push_subscriptions' as any)
      .upsert(
        { user_id: userId, endpoint, p256dh, auth },
        { onConflict: 'user_id,endpoint' }
      );

    if (error) {
      console.error('Error saving push subscription:', error);
    }
  } catch (err) {
    console.error('Failed to register SW or subscribe to push:', err);
  }
}
