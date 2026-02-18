

# Fix: Mobile Users Not Getting Pop-Up Toast Notifications

## Root Cause

Mobile browsers aggressively throttle and kill WebSocket connections when the app is in the background, the screen turns off, or the browser tab loses focus. When the user returns to the app, the Supabase Realtime channel may reconnect, but **missed INSERT events are never replayed**. This means:

- The toast notification (triggered only by the realtime INSERT callback) is never shown
- The bell icon loads correctly because it fetches all notifications from the database on mount/focus via `loadNotifications()`

Desktop browsers are much more lenient with WebSocket connections, which is why desktop users see the toasts but mobile users do not.

## Fix: Add Visibility-Based Polling Fallback

Add a `visibilitychange` listener and a periodic polling fallback inside `useNotifications.ts` that:

1. **On tab/app regain focus**: Immediately fetches the latest notifications and shows toasts for any new ones received while the app was in the background
2. **Periodic light poll (every 30s)**: Acts as a safety net for cases where the Realtime WebSocket silently disconnects without the visibility API triggering
3. **Deduplication**: Tracks the timestamp of the last processed notification to avoid showing duplicate toasts

### Changes to `src/hooks/useNotifications.ts`

Add a new `useEffect` that:
- Tracks `lastCheckedAt` timestamp using a ref
- On `visibilitychange` (document becomes visible), queries for notifications created after `lastCheckedAt`
- For each new notification found, triggers the same toast/sound logic as the realtime callback
- Sets up a 30-second interval poll as backup
- Updates `lastCheckedAt` after each check

```text
Key logic flow:

[App loses focus / goes to background]
    |
    v
[WebSocket may disconnect, INSERT events missed]
    |
    v
[User returns to app / screen wakes up]
    |
    v
[visibilitychange fires -> poll for new notifications since lastCheckedAt]
    |
    v
[Show toast + play sound for each new notification found]
    |
    v
[Update lastCheckedAt to now]
```

### Additional: Deduplicate with state

The existing realtime callback already adds notifications to state. The polling fallback will check against current state IDs to avoid duplicate toasts.

## Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/useNotifications.ts` | Add visibility-change listener and 30s polling fallback to catch missed realtime events; show toast + sound for new notifications found via polling |

No other files need changes. The Sonner component is already correctly configured with `position="top-center"`, `richColors`, `expand`, and `zIndex: 9999`.

## Technical Details

- The polling query uses `.gt('created_at', lastCheckedAt)` to fetch only new notifications
- Moderation notification types are still excluded from toasts (handled by `AccountModerationOverlay`)
- The `lastCheckedAt` ref is initialized to the current timestamp on mount and updated after each successful poll
- The 30s interval is cleared on unmount to prevent memory leaks
- The visibility listener is also cleaned up on unmount

