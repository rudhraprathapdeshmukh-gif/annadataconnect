

# Fix: Mobile Notifications (Toast + Sound) Not Working

## Root Causes Identified

### 1. Sound Fails Silently on Mobile
Both `playNotificationSound()` and `playDonationAlertSound()` create a **new `AudioContext()` on every call**. Mobile browsers (iOS Safari, Chrome Android) enforce an autoplay policy: `AudioContext` can only be created or resumed after a **user gesture** (tap, click). When these functions are called from a Realtime callback or a polling timer (not a user gesture), the `AudioContext` creation silently fails inside the try-catch block. No sound ever plays on mobile.

### 2. Toasts Not Showing After Background/Navigation
There is a race condition when the app returns from background or the user navigates between pages:
- The hook remounts, setting `lastCheckedAtRef` to "now"
- `loadNotifications` runs and loads recent unread notifications into state (no toast shown)
- The polling fallback then checks for notifications created AFTER "now" -- so it never finds the ones that arrived while the app was away
- Result: notification appears in the bell icon but no toast pop-up is shown

## Fixes

### Fix 1: Warm AudioContext on First User Interaction
Create a **shared, persistent AudioContext** that is initialized once on the user's first tap/click/keypress. Reuse this context for all subsequent notification sounds. This satisfies the browser's autoplay policy because the context was created during a user gesture.

**New file: `src/lib/audioContext.ts`**
- Creates a module-level `AudioContext` variable (initially null)
- Exports `getAudioContext()` that returns the shared context
- On first call, registers a one-time `click`/`touchstart` listener that creates the `AudioContext`
- Also attempts to `resume()` the context if it was suspended

**Update: `src/lib/notificationSound.ts`**
- Import `getAudioContext()` instead of creating `new AudioContext()` each time
- Fall back to playing `public/notification.mp3` via the `Audio` API if AudioContext is unavailable

**Update: `src/lib/donationAlertSound.ts`**
- Same pattern: use shared `getAudioContext()` instead of creating a new one each time

### Fix 2: Show Toasts for Recent Unread Notifications on Mount
**Update: `src/hooks/useNotifications.ts`**
- In `loadNotifications`, after fetching notifications, check for any **unread notifications less than 2 minutes old**
- Show toasts for those recent ones (they likely arrived while the app was backgrounded or during page navigation)
- Set `lastCheckedAtRef` to the timestamp of the most recent notification (not "now") to prevent the polling fallback from re-toasting them
- Reduce polling interval from 30s to 15s for faster catch-up on mobile

## Files Changed

| File | Change |
|------|--------|
| `src/lib/audioContext.ts` | New -- shared AudioContext with user-gesture warm-up |
| `src/lib/notificationSound.ts` | Use shared AudioContext; fall back to Audio element |
| `src/lib/donationAlertSound.ts` | Use shared AudioContext |
| `src/hooks/useNotifications.ts` | Show toasts for recent unread on mount; reduce poll interval to 15s |

## How This Solves the Problem

- **Sound on mobile**: The AudioContext is created during the user's first interaction with the app (guaranteed user gesture), then reused for all notification sounds
- **Toasts on mobile**: Recent unread notifications trigger toasts even when loaded via the initial fetch (not just via Realtime/polling), closing the race condition gap
- **Faster catch-up**: 15s polling ensures notifications are picked up sooner on mobile where Realtime may lag

