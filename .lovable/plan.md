

# Add Special Notification Sound for Nearby Donation Alerts

## Problem

When a donor posts a new donation, receivers in the matching radius/district get a `nearby_donation` notification, but it plays the same generic beep as every other notification. There is an existing `donationAlertSound.ts` file with a distinctive chime pattern, but it is unused and has a stale reference to the deleted `notification.mp3`.

## What Already Works

The backend (`notify-nearby-users` edge function + `notify_nearby_on_donation_insert` trigger) already notifies receivers within 10km radius OR matching district when a donation is posted. No backend changes are needed.

## Changes

### 1. Fix `src/lib/donationAlertSound.ts`

- Add mobile support (resume suspended AudioContext, same pattern as `notificationSound.ts`)
- Replace the stale `notification.mp3` fallback with a programmatic Web Audio fallback
- Keep the distinctive 7-note chime pattern (C5-E5-G5-A5-G5-E5-C5) that makes it clearly different from the standard beep

### 2. Update `src/contexts/NotificationContext.tsx`

- Import `playDonationAlertSound` from `donationAlertSound.ts`
- In `showNotificationToast()`, check if `n.type === 'nearby_donation'` and play the special chime instead of the generic beep
- All other notification types continue using the standard beep -- no preference changes

## How It Will Sound

| Notification Type | Sound |
|---|---|
| `nearby_donation` (new food posted) | 7-note rising/falling chime (~3.5 seconds) |
| All other types | Short 2-tone beep (~0.3 seconds) |

## Technical Detail

```text
showNotificationToast(n):
  if n.type === 'nearby_donation'
    -> playDonationAlertSound()   (chime)
  else
    -> playNotificationSound()    (beep)
```

No notification preferences, backend logic, or other notification behavior will be modified.

