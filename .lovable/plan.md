

# Location-Based Notification System

## Overview
When a new food donation is created, automatically notify all nearby receivers (within 10km) so they can quickly claim available food.

## What Already Exists
- `food_donations` table already has `latitude` and `longitude` columns (populated when donors create donations)
- `profiles` table exists but does NOT have latitude/longitude -- user locations are only in `saved_addresses`
- `notifications` table exists with the right structure (`user_id`, `type`, `title`, `message`, `related_id`)
- Haversine distance calculation already exists in `src/lib/geoUtils.ts`

## What Needs to Be Built

### Step 1: Database Migration

**Add location columns to `profiles` table:**
- Add `latitude` (double precision, nullable) and `longitude` (double precision, nullable) to the `profiles` table
- These represent the user's primary/default location for receiving proximity notifications

**Create a database webhook trigger** using `pg_net` to call the edge function on every new donation insert:
- Enable the `pg_net` extension (for making HTTP calls from SQL)
- Create a trigger function `notify_nearby_on_donation_insert()` that fires AFTER INSERT on `food_donations`
- The trigger sends a POST request to the `notify-nearby-users` edge function with the new donation's `id`, `latitude`, `longitude`, and `title`
- Only fires when the donation has valid coordinates (both lat and lng are not null)

**Note on PostGIS:** Instead of enabling the full PostGIS extension (which is heavy and complex), the plan uses the **Haversine formula in SQL** -- this is lighter, doesn't require extension installation, and works perfectly for 10km radius queries. The result is identical for this use case.

### Step 2: Edge Function -- `notify-nearby-users`

Create `supabase/functions/notify-nearby-users/index.ts`:

- **Authentication**: Set `verify_jwt = false` in config.toml (webhook calls don't carry JWT)
- **Validation**: Verify the request contains `donation_id`, `latitude`, `longitude`, and `title`
- **Query nearby receivers**: Using the service role key, run a SQL query against `profiles` to find all users where:
  - `user_type` is `'receiver'` or `'both'` (not pure donors)
  - `latitude` and `longitude` are not null
  - Distance from donation location is within 10km (calculated via Haversine formula in SQL)
  - `notification_push` is not explicitly `false` (respect user preferences)
  - User is NOT the donor themselves
- **Insert notifications**: For each nearby user, insert a row into the `notifications` table:
  - `type`: `'nearby_donation'`
  - `title`: `'New Food Donation Nearby!'`
  - `message`: `'New food donation available X.X km away!'` (with actual calculated distance)
  - `related_id`: the donation ID
- **Response**: Return count of notifications sent

The Haversine SQL used in the query:
```text
6371 * acos(
  cos(radians(donation_lat)) * cos(radians(p.latitude)) *
  cos(radians(p.longitude) - radians(donation_lng)) +
  sin(radians(donation_lat)) * sin(radians(p.latitude))
) <= 10
```

### Step 3: Update config.toml

Add the new edge function entry:
```text
[functions.notify-nearby-users]
verify_jwt = false
```

### Step 4: Frontend -- Auto-populate Profile Location

**Update `src/pages/Profile.tsx`:**
- When a user saves their profile or uses "current location", store the `latitude` and `longitude` in the `profiles` table
- If the user has a default saved address with coordinates, auto-populate `profiles.latitude` and `profiles.longitude` from it

**Update `src/hooks/useNotifications.ts`:**
- Add `'nearby_donation'` to the Notification `type` union so the new notification type is recognized and displayed properly

### Step 5: Auto-Populate Location on Donation (Optional Enhancement)

When a donor creates a donation in the Donate page, their profile location can also be updated if they share their current GPS -- this ensures more profiles have location data over time.

## How It All Works Together

```text
Donor creates donation (with lat/lng)
         |
         v
Database trigger fires (AFTER INSERT on food_donations)
         |
         v
pg_net sends HTTP POST to notify-nearby-users edge function
         |
         v
Edge function queries profiles within 10km radius
         |
         v
Inserts notification rows for each nearby receiver
         |
         v
Existing realtime subscription picks up new notifications
         |
         v
Receivers see toast + bell notification instantly
```

## Files to Create/Modify

| File | Action |
|------|--------|
| Database migration (SQL) | Add lat/lng to profiles, create pg_net trigger |
| `supabase/functions/notify-nearby-users/index.ts` | New edge function |
| `supabase/config.toml` | Add function entry (auto-managed) |
| `src/pages/Profile.tsx` | Save lat/lng to profiles table |
| `src/hooks/useNotifications.ts` | Add `nearby_donation` type |

## Technical Notes

- No PostGIS extension needed -- Haversine formula in SQL achieves the same result for radius queries and is simpler to maintain
- The edge function uses the service role key to bypass RLS (since it's a server-side operation triggered by a webhook, not a user action)
- Existing realtime subscriptions in `useNotifications.ts` will automatically pick up the new notifications -- no additional client-side subscription needed
- The `pg_net` extension is used for the database-to-edge-function webhook call
- User notification preferences are respected (only users with `notification_push != false` are notified)

