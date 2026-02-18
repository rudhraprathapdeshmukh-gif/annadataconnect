

# Fix: Mobile Notifications Not Arriving While App Is Active

## Problem

Notifications only appear after a page refresh on mobile because:

1. **Hook remounts on every page navigation** -- Each page (Dashboard, Donate, History, Profile, Help) independently renders its own `<Navbar />`, which contains `<NotificationBell />`, which calls `useNotifications()`. Navigating between pages unmounts the old Navbar and mounts a new one, killing the Realtime WebSocket channel and restarting the 5-second polling timer. During this gap, notifications are missed.

2. **Multiple competing subscriptions** -- On mobile, the teardown/setup cycle is slower, and race conditions between the old channel's cleanup and the new channel's setup can cause the subscription to silently fail.

## Solution

Move the notification logic to a **React Context** at the app level so it stays mounted across all page navigations. The `NotificationBell` component will consume the context instead of running its own hook instance.

## Changes

### 1. Create `src/contexts/NotificationContext.tsx`

- Move ALL logic from `useNotifications` hook into a new `NotificationProvider` component
- Export a `useNotificationContext()` hook that reads from the context
- The provider will be mounted once in `App.tsx` and never unmount during navigation

### 2. Update `src/App.tsx`

- Wrap routes with `<NotificationProvider>` inside the `AppContent` component (needs access to `useAuth`)
- The provider sits above all routes, so navigating between pages does NOT remount it

### 3. Update `src/components/NotificationBell.tsx`

- Replace `import { useNotifications }` with `import { useNotificationContext }`
- Everything else stays the same -- same props, same UI

### 4. Remove `src/hooks/useNotifications.ts`

- No longer needed since the logic lives in the context provider

## Technical Details

| Aspect | Before | After |
|--------|--------|-------|
| Hook location | Inside NotificationBell (per-page) | App-level context (singleton) |
| Remounts on navigation | Yes (kills WebSocket + restarts polling) | No (stays mounted) |
| Realtime channel lifetime | Seconds (until next navigation) | Entire session |
| Polling continuity | Interrupted on every page change | Uninterrupted |

## Why This Fixes Mobile

On mobile, navigations are more disruptive because:
- WebSocket reconnection is slower on cellular networks
- The browser may throttle the new subscription setup
- The 5-second poll timer resets on every mount, creating blind spots

By keeping the provider mounted at the app level, the Realtime channel and polling timer survive all navigations, ensuring continuous notification delivery.

