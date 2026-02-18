

# Fix: Instant Mobile Notifications (Toast + Sound)

## Problem

Mobile users receive notifications only after a page refresh, or with significant delay. Desktop works fine because WebSocket connections are stable there.

## Root Causes

1. **Realtime WebSocket dies on mobile** -- Mobile browsers aggressively throttle/kill WebSocket connections when the screen turns off, the app is backgrounded, or even during idle periods. Supabase Realtime does NOT replay missed events when it reconnects.

2. **Polling interval too slow (15s)** -- The current 15-second polling fallback means notifications can be delayed up to 15 seconds even when the app is active. Users perceive this as "late."

3. **No Realtime channel health monitoring** -- When the Realtime channel silently disconnects on mobile, there's no detection or forced reconnection. The app just stops receiving events with no fallback until the next poll cycle.

4. **Navbar remounts on every page navigation** -- Each page (Dashboard, Donate, History, etc.) independently renders `<Navbar />`, so navigating between pages unmounts the old hook and mounts a new one. During this gap, events can be missed, and the new hook must re-subscribe (adding latency).

## Fixes

### Fix 1: Aggressive Polling (5s interval)

Reduce polling interval from 15 seconds to **5 seconds**. This is a lightweight query (fetching a few rows filtered by user_id and timestamp) and ensures notifications appear within 5 seconds even when Realtime is completely broken.

### Fix 2: Monitor Realtime Channel Health

Add subscription status callback to detect `CHANNEL_ERROR`, `TIMED_OUT`, or `CLOSED` states. When detected, immediately tear down and recreate the channel subscription to force a reconnect.

### Fix 3: Poll Immediately on Online/Visibility Events

In addition to the existing `visibilitychange` listener, add an `online` event listener so notifications are fetched immediately when the device regains network connectivity.

### Fix 4: Prevent Duplicate Toasts on Realtime + Poll Race

When both Realtime and polling deliver the same notification, the current deduplication (checking `existingIds`) in the poll is correct. But the Realtime callback should also check against `notificationsRef` to avoid showing a toast for a notification that was already picked up by polling.

## Changes

### `src/hooks/useNotifications.ts`

- Reduce polling interval from `15000` to `5000` ms
- Add `online` event listener alongside `visibilitychange` for immediate poll on reconnect
- Add channel subscription status monitoring with automatic reconnect on error
- Add deduplication check in the Realtime INSERT callback against `notificationsRef`

## Technical Details

| Area | Before | After |
|------|--------|-------|
| Poll interval | 15 seconds | 5 seconds |
| Visibility handler | visibilitychange only | visibilitychange + online |
| Channel error handling | None | Auto-reconnect on CHANNEL_ERROR/TIMED_OUT/CLOSED |
| Realtime dedup | None (trusts Realtime) | Check notificationsRef before toasting |

Only one file changes: `src/hooks/useNotifications.ts`
