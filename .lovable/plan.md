

# Fix: In-App Toast Notifications Not Popping Up on Mobile

## Root Cause

In `src/contexts/NotificationContext.tsx`, the `showNotificationToast` function has this guard on line 67:

```typescript
if (!isPushEnabled(preferencesRef.current)) return;
```

This blocks ALL in-app toast pop-ups when the user's `notification_push` preference is `false` (or not yet loaded). But in-app toasts and browser push notifications are two separate things:
- **In-app toasts** (the pop-up banners inside the app) should ALWAYS show when the user is actively using the app
- **Browser push notifications** (the OS-level alerts) should respect the push preference

Currently, disabling push also kills in-app toasts, which is why notifications appear in the bell (data arrives via polling) but never pop up visually.

## Fix

### `src/contexts/NotificationContext.tsx`

**Remove the `isPushEnabled` guard from `showNotificationToast`** so that in-app toasts always fire:

```typescript
const showNotificationToast = (n: Notification) => {
  if (toastedIdsRef.current.has(n.id)) return;
  if (moderationTypes.includes(n.type)) return;
  // REMOVED: if (!isPushEnabled(preferencesRef.current)) return;

  toast.info(n.title, { description: n.message });

  toastedIdsRef.current.add(n.id);
  if (toastedIdsRef.current.size > 200) {
    const first = toastedIdsRef.current.values().next().value;
    if (first) toastedIdsRef.current.delete(first);
  }
};
```

The `isPushEnabled` check is already correctly used on line 165 to gate the **browser-level `new Notification()`** call -- that stays unchanged.

## Summary

| What | Before | After |
|------|--------|-------|
| In-app toast pop-ups | Blocked when push is off | Always shown |
| Browser push notifications | Gated by preference | Gated by preference (unchanged) |

One line removed from one file. No other changes needed.

