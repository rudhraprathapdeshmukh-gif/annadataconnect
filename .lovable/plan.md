

# Fix: Duplicate Notification Toasts on App Reopen

## Problem

When users close and reopen the app within a short time, the same notifications pop up again as toasts. This happens because:

1. On every mount, `loadNotifications` shows toasts for all unread notifications from the last 2 minutes -- even if they were already toasted in the previous session
2. Three separate code paths (mount load, Realtime callback, 5s polling) can all try to toast the same notification, racing against each other

## Solution

Add a **"toasted IDs" tracker** -- a `Set<string>` ref that records every notification ID that has already been shown as a toast. Before showing any toast anywhere in the code, check this set first. This is a single, centralized guard that prevents duplicates across all three code paths.

## Changes

### `src/hooks/useNotifications.ts`

1. Add a new ref: `const toastedIdsRef = useRef<Set<string>>(new Set())`
2. Create a helper function `showNotificationToast(notification)` that:
   - Checks if `toastedIdsRef.current.has(notification.id)` -- if yes, skip
   - Checks if it's a moderation type -- if yes, skip
   - Plays the appropriate sound
   - Shows the toast
   - Adds the ID to `toastedIdsRef`
3. Replace all three toast-triggering locations with calls to `showNotificationToast()`:
   - In `loadNotifications` (mount-time recent unread toasts)
   - In the Realtime INSERT callback
   - In `pollForMissedNotifications`
4. Cap the `toastedIdsRef` set size to prevent unbounded growth (keep last 200 IDs)

This ensures each notification toast is shown exactly once, regardless of which code path detects it first.

## Technical Details

| File | Change |
|------|--------|
| `src/hooks/useNotifications.ts` | Add `toastedIdsRef` Set, centralized `showNotificationToast` helper, replace 3 toast call sites |

No other files need changes.
