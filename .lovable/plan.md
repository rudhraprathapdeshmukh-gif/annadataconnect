

# Fix: Mobile Push Notifications, Rating Moderation, and Donor Profile Rating

## Issue 1: Mobile Push Notifications Failing (401 errors)

### Root Cause
The `notify-nearby-users` edge function sends web push notifications using a **simple HTTP POST** to the push endpoint without any cryptographic signing. The Web Push protocol requires:
1. A **VAPID JWT** in the `Authorization` header (signed with the private key)
2. **Payload encryption** using the subscriber's `p256dh` and `auth` keys (RFC 8291)

Without these, push services (Google FCM, Mozilla autopush) reject the request with **401 Unauthorized** -- which matches the logs showing `Push failed for ...: 401`.

The in-app notifications (database inserts + Realtime) **are working** -- there are `nearby_donation` records in the database. The issue is only with background/mobile push delivery.

### Fix
Replace the simple `fetch(endpoint)` in `notify-nearby-users` with proper Web Push using the `web-push` npm library (available on esm.sh for Deno). This handles VAPID signing and payload encryption automatically.

```text
Before:  fetch(endpoint, { body: payload })  --> 401
After:   webpush.sendNotification(sub, payload, { vapidDetails })  --> 201
```

### Changes to `supabase/functions/notify-nearby-users/index.ts`
- Import the `web-push` library from esm.sh
- Configure VAPID details (subject, public key, private key)
- Replace the raw fetch loop with `webpush.sendNotification()` calls
- Clean up stale subscriptions on 404/410 responses

---

## Issue 2: Rating-Based Warning/Suspension/Blocking Not Working

### Root Cause
The `checkDonorLowRatings` function in `Dashboard.tsx` runs **client-side** and tries to insert rows into the `notifications` table. However, the `notifications` table has **no INSERT RLS policy** for regular users:

- SELECT: allowed (own notifications)
- UPDATE: allowed (own notifications) 
- DELETE: allowed (own notifications)
- INSERT: **not allowed**

This means every `supabase.from('notifications').insert(...)` call from the client silently fails. The warning, suspension notification, and block notification are never created. The `profiles` table UPDATE for `suspended_until` and `permanently_blocked` also fails because the receiver (who is rating) is trying to update the **donor's** profile, which RLS blocks (users can only update their own profile).

### Fix
Move the `checkDonorLowRatings` logic to a **database trigger** that fires when `receiver_rating` is updated on `food_requests`. This runs as `SECURITY DEFINER`, bypassing RLS, and can safely:
1. Query recent ratings for the donor
2. Insert warning/suspension/block notifications
3. Update the donor's profile with `suspended_until` or `permanently_blocked`

### Database Migration
Create a trigger function `check_donor_low_ratings()` that:
- Fires on UPDATE of `food_requests` when `receiver_rating` changes from NULL to a value
- Looks up the donor via `food_donations`
- Checks last 3, 5, and 7 `receiver_rating` values
- At 3 consecutive ratings of 2 or below: inserts a `low_rating_warning` notification (with 7-day dedup)
- At 5 consecutive: sets `suspended_until` to 48 hours from now and inserts `account_suspended` notification
- At 7 consecutive: sets `permanently_blocked = true` and inserts `account_blocked` notification

### Changes to `src/pages/Dashboard.tsx`
- Remove the `checkDonorLowRatings` function entirely
- Remove the call to it in `handleGlobalRatingSubmit`
- The trigger handles everything server-side now

---

## Issue 3: Donor Average Rating Not Shown on Own Profile

### Root Cause
The Profile page computes `averageRating` and `totalRatings` but only displays them in the `!isOwnProfile` section (viewing someone else's profile). The own profile section has no rating display.

### Fix
Add the average rating display to the own profile section, below the User Type badge.

### Changes to `src/pages/Profile.tsx`
Add a rating card in the own profile view showing:
- Star icon with the average rating number
- Total number of ratings
- Only displayed when the user has ratings

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/notify-nearby-users/index.ts` | Replace raw fetch with `web-push` library for proper VAPID-signed push |
| Database migration | Create `check_donor_low_ratings()` trigger on `food_requests` UPDATE |
| `src/pages/Dashboard.tsx` | Remove client-side `checkDonorLowRatings` function and its call |
| `src/pages/Profile.tsx` | Add average rating display to own profile section |

