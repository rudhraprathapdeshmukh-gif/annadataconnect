
# Push Notifications + Sound Effect for In-App Notifications

## Overview
The browser push notification system already exists but may not be prompting users effectively. This plan adds:
1. A **notification sound effect** that plays when an in-app toast notification appears
2. **Auto-prompt for push notification permission** for receivers who haven't granted it yet
3. Ensure push notifications work reliably for `nearby_donation` type

## Changes

### 1. Add a notification sound file
- Create/add a short notification sound audio file (e.g., `public/notification.mp3`) -- a brief, pleasant chime sound
- This will be a small MP3 file embedded in the project

### 2. Update `src/hooks/useNotifications.ts` -- Play sound on new notification

Add a sound playback function that triggers alongside the toast notification:

```typescript
// Inside the realtime INSERT callback, before/alongside the toast:
const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {}); // Silently fail if autoplay blocked
  } catch {}
};

// In the callback:
if (pushEnabled) {
  playNotificationSound();
  toast.info(newNotification.title, {
    description: newNotification.message,
  });
}
```

### 3. Update `src/pages/Dashboard.tsx` -- Auto-prompt push permission for receivers

When a receiver loads the dashboard and hasn't granted notification permission yet, automatically prompt them:

```typescript
// After location detection, if user is a receiver and permission is 'default':
if (permission === 'default' && Notification) {
  requestPermission();
}
```

This uses the existing `requestPermission` from `useNotifications`.

## Files Modified
- `public/notification.mp3` -- New notification sound file
- `src/hooks/useNotifications.ts` -- Add sound playback on new notifications
- `src/pages/Dashboard.tsx` -- Auto-prompt push notification permission for receivers
