

# Fix: Receivers Not Receiving In-App or Push Notifications

## Root Cause

There are two issues preventing notifications from working:

### Issue 1: Duplicate Realtime Channels (Primary)
`useNotifications()` is called in **two separate components** simultaneously:
- `NotificationBell.tsx` (in the Navbar -- always mounted)
- `Dashboard.tsx` (added recently for auto-prompting push permission)

Each call creates its own Supabase realtime channel with the **same name** (`'notifications'`). When two channels share the same name, Supabase can silently drop or conflict on one of them, causing the notification listener in `NotificationBell` to stop receiving events.

### Issue 2: Stale `permission` in Callback Closure
The realtime callback in `useNotifications.ts` captures `permission` at the time the subscription is created. If the user grants permission later (via the auto-prompt), the callback still sees `'default'` and skips the browser push notification. The `preferences` value was already fixed with a ref, but `permission` was not.

## Fix

### 1. Remove duplicate `useNotifications()` from Dashboard.tsx

Instead of calling the full hook in Dashboard, move the auto-prompt logic into the existing `useNotifications` hook itself. This way there's only one instance of the hook (in `NotificationBell`), and no duplicate realtime channels.

**File: `src/hooks/useNotifications.ts`**
- Add a `useEffect` inside the hook that auto-prompts for permission when the user is a receiver and permission is `'default'`.
- Load the user's `user_type` from the profile data already fetched by the hook (the `preferences` query can be extended to include `user_type`).

**File: `src/pages/Dashboard.tsx`**
- Remove the `useNotifications()` call entirely.
- Remove the auto-prompt `useEffect`.
- Remove the `useNotifications` import.

### 2. Use a ref for `permission` in the realtime callback

**File: `src/hooks/useNotifications.ts`**
- Create a `permissionRef` (similar to the existing `preferencesRef`) to always have the latest permission value inside the realtime callback.
- Use `permissionRef.current` instead of `permission` when checking whether to show browser push notifications.

## Technical Details

### Changes to `src/hooks/useNotifications.ts`

```typescript
// Add permissionRef alongside existing preferencesRef
const permissionRef = useRef<NotificationPermission>('default');

useEffect(() => {
  permissionRef.current = permission;
}, [permission]);

// In the realtime callback, replace:
//   if (pushEnabled && permission === 'granted')
// with:
//   if (pushEnabled && permissionRef.current === 'granted')

// Add auto-prompt logic inside the hook:
useEffect(() => {
  if (!user) return;
  // Load user_type from preferences query (already fetched)
  // If user_type is 'receiver' or 'both' and permission is 'default', auto-prompt
  if (
    (preferences?.user_type === 'receiver' || preferences?.user_type === 'both') &&
    permission === 'default' &&
    'Notification' in window
  ) {
    requestPermission();
  }
}, [user, preferences?.user_type, permission]);
```

The `preferences` query will be extended to also select `user_type` from the profiles table.

### Changes to `src/pages/Dashboard.tsx`

- Remove line: `import { useNotifications } from '@/hooks/useNotifications';`
- Remove line: `const { permission, requestPermission } = useNotifications();`
- Remove the auto-prompt `useEffect` block (lines 208-218)

## Summary of File Changes

| File | Change |
|------|--------|
| `src/hooks/useNotifications.ts` | Add `permissionRef`, extend preferences to include `user_type`, add auto-prompt logic inside the hook |
| `src/pages/Dashboard.tsx` | Remove `useNotifications` import, call, and auto-prompt effect |

