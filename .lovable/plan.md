

# District Donation Notification with Special Tune and Background Push

## Overview
When a donor posts a donation, all receivers in the same district will get notified with a special distinct tune that plays for 5 seconds, and receive a push notification even when the site is closed. This requires adding a Service Worker for background push support and a new audio file for the special tune.

## Implementation

### 1. Add a special notification sound file

Add a new audio file `public/donation-alert.mp3` -- a distinct, attention-grabbing 5-second tune (different from the generic `notification.mp3`). Since we can't source a real audio file, we'll use the Web Audio API to generate a programmatic 5-second chime as a fallback, or reuse the existing file with a longer playback approach.

**Approach**: Create a helper function `playDonationAlertSound()` that uses the Web Audio API to generate a distinctive 5-second chime pattern (no external file needed). This avoids needing to upload a custom audio file.

### 2. Create a Service Worker for background push notifications

Create `public/sw.js` -- a service worker that:
- Listens for `push` events and displays notifications even when the site is closed
- Plays the notification sound via the `notification` event
- Handles notification click to open/focus the app

### 3. Register the Service Worker in `useNotifications.ts`

- Register `sw.js` on mount
- Subscribe to Web Push using VAPID keys (generated and stored as secrets)
- Save the push subscription to a new `push_subscriptions` table so the backend can send pushes

### 4. Create a `push_subscriptions` database table

Store each user's push subscription endpoint and keys so the edge function can send background pushes.

### 5. Update `notify-nearby-users` edge function

After inserting notification rows, also send Web Push messages to district-matched receivers using their stored push subscriptions via the `web-push` protocol.

### 6. Update `useNotifications.ts` -- special tune for donation alerts

In the realtime callback, check if the notification type is `nearby_donation`. If so, play the special 5-second tune instead of the regular notification sound.

### 7. Generate VAPID keys

VAPID keys are required for Web Push. We'll need to generate a key pair and store the private key as a secret, while the public key goes in the frontend.

## Technical Details

### Database Migration

```sql
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### New file: `public/sw.js`

```javascript
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'New Donation Nearby!', {
      body: data.message || 'A new food donation is available in your area!',
      icon: '/favicon.ico',
      tag: data.id || 'donation-alert',
      data: { url: '/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
```

### Changes to `src/hooks/useNotifications.ts`

1. Register service worker and subscribe to push on mount
2. Save subscription to `push_subscriptions` table
3. In the realtime INSERT callback, play a special 5-second chime for `nearby_donation` type notifications using Web Audio API

```typescript
// Special 5-second chime for donation alerts
const playDonationAlertSound = () => {
  const ctx = new AudioContext();
  const frequencies = [523, 659, 784, 880, 784, 659, 523]; // C5-E5-G5-A5 pattern
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.value = 0.3;
    osc.start(ctx.currentTime + i * 0.7);
    osc.stop(ctx.currentTime + i * 0.7 + 0.5);
  });
};
```

### Changes to `notify-nearby-users` edge function

After inserting notifications, query `push_subscriptions` for the notified user IDs and send Web Push messages using the VAPID private key and the standard Web Push protocol.

### Secrets needed

- `VAPID_PUBLIC_KEY` -- used in frontend for push subscription
- `VAPID_PRIVATE_KEY` -- used in edge function for sending pushes

## Files Modified

| File | Change |
|------|--------|
| Database migration | Create `push_subscriptions` table with RLS |
| `public/sw.js` | New service worker for background push notifications |
| `src/hooks/useNotifications.ts` | Register SW, save push subscription, play special 5s tune for donation alerts |
| `supabase/functions/notify-nearby-users/index.ts` | Send Web Push messages to district receivers |
| Secret: `VAPID_PUBLIC_KEY` | New secret for push subscription |
| Secret: `VAPID_PRIVATE_KEY` | New secret for sending push messages |

