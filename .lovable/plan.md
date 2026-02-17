

# Full-Screen Moderation Alerts for Warning, Suspension, and Block

## Overview

Replace the small inline alerts and toast notifications for `low_rating_warning`, `account_suspended`, and `account_blocked` with full-screen overlay dialogs that demand attention on both mobile and desktop.

## Current Behavior

- **Donate page**: Shows a small `Alert` component inline when suspended/blocked -- easy to miss
- **Realtime notifications**: Shows a small toast popup for warning/suspension/blocked -- dismissed in seconds
- **Other pages (Dashboard, History, etc.)**: No moderation alerts shown at all

## Proposed Changes

### 1. New Component: `AccountModerationOverlay.tsx`

Create a new full-screen overlay component that:
- Checks the user's `suspended_until` and `permanently_blocked` status from the `profiles` table on mount
- Listens for realtime `low_rating_warning`, `account_suspended`, and `account_blocked` notification types
- Renders a full-screen, non-dismissible overlay (using AlertDialog without a cancel button) when any moderation state is active
- Shows different content based on the moderation type:
  - **Warning**: Yellow/amber full-screen alert with the warning message, dismissible with an "I Understand" button
  - **Suspension**: Red full-screen alert showing suspension reason and lift date, with only a "Log Out" or "OK" button
  - **Blocked**: Red full-screen alert explaining permanent block, with only a "Log Out" button

### 2. Update `useNotifications.ts`

- Stop showing toast notifications for `low_rating_warning`, `account_suspended`, and `account_blocked` types
- These three types will be handled exclusively by the new full-screen overlay

### 3. Update `src/pages/Donate.tsx`

- Remove the inline `Alert` components for suspension and blocked states (lines 404-419)
- Remove the `suspendedUntil` and `permanentlyBlocked` state and related fetch logic (lines 79-80, 194-205)
- The form disabling logic stays -- but is now driven by the overlay component or a shared check

### 4. Update `src/App.tsx`

- Add the `AccountModerationOverlay` component inside the `AppContent` so it renders on all authenticated routes
- It will check moderation status globally, so donors see the full-screen message regardless of which page they are on

## Technical Details

### `AccountModerationOverlay.tsx` Structure

```
- Uses AlertDialog (non-dismissible overlay)
- On mount: fetches profiles.suspended_until, profiles.permanently_blocked
- Subscribes to notifications table for types: low_rating_warning, account_suspended, account_blocked
- Three visual states:
  1. Warning overlay (amber, dismissible)
  2. Suspension overlay (red, shows lift date)
  3. Blocked overlay (red, permanent)
- Full viewport coverage with high z-index
- Responsive design for both mobile and desktop
```

### Files Modified

| File | Change |
|------|--------|
| `src/components/AccountModerationOverlay.tsx` | New component -- full-screen moderation alerts |
| `src/hooks/useNotifications.ts` | Skip toast for `low_rating_warning`, `account_suspended`, `account_blocked` |
| `src/pages/Donate.tsx` | Remove inline Alert components and related state for suspension/blocked |
| `src/App.tsx` | Add `AccountModerationOverlay` to authenticated routes |

