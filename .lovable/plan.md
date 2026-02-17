

# Fix: Notification Popups with Sound for Requests, Approvals, and Messages

## Root Cause

A recent database migration accidentally **removed** several notification types from the `notifications_type_check` constraint. The current constraint only allows:
`nearby_donation`, `request_approved`, `donation_cancelled`, `donation_expired`, `message_received`, `low_rating_warning`, `account_suspended`, `account_blocked`

**Missing types**: `donation_requested`, `extension_request`, `extension_granted`, `extension_rejected`

This means when a receiver sends a food request, the client-side insert of a `donation_requested` notification **silently fails** because the database rejects the row. The donor never gets notified.

The `request_approved` and `message_received` types ARE in the constraint, so those notifications should be created. However, the notification sound uses `notification.mp3` via `new Audio()`, which can be unreliable on mobile due to autoplay restrictions.

## Fixes

### 1. Database Migration: Restore missing notification types

Update the CHECK constraint to include all required types:

```sql
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'nearby_donation', 'request_approved', 'donation_cancelled', 
  'donation_expired', 'message_received', 'low_rating_warning', 
  'account_suspended', 'account_blocked',
  'donation_requested', 'extension_request', 
  'extension_granted', 'extension_rejected'
));
```

### 2. Replace unreliable `notification.mp3` with Web Audio API popup sound

Create a simple, short popup sound using the Web Audio API (same approach as the donation alert chime) that works reliably across mobile and desktop browsers. This will be a brief two-tone "ding" sound -- pleasant and non-intrusive.

**New file**: `src/lib/notificationSound.ts`
- A simple two-note chime (C5 -> E5) lasting about 0.5 seconds
- Uses Web Audio API (no external file dependency)
- Works on mobile where `new Audio()` often fails

### 3. Update `useNotifications.ts` to use the new sound

- Add `donation_requested` to the TypeScript `Notification` type union
- Replace the `new Audio('/notification.mp3')` call with the new Web Audio popup sound
- Keep the special 5-second chime for `nearby_donation` alerts

## Files Modified

| File | Change |
|------|--------|
| Database migration | Restore `donation_requested`, `extension_request`, `extension_granted`, `extension_rejected` to type constraint |
| `src/lib/notificationSound.ts` | New file: simple Web Audio API popup sound |
| `src/hooks/useNotifications.ts` | Add missing types to interface; replace `notification.mp3` with Web Audio sound |
