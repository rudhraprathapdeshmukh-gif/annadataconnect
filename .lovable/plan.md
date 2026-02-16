
# District-Wide Notifications for Receivers

## Overview
Currently, the notification system only alerts receivers within a **10km radius** of a new donation. This plan expands it to notify **all registered receivers in the same district** by storing each user's district in the database and matching it when a donation is created.

## Changes

### 1. Database Migration -- Add `district` column to `profiles`

Add a `district` text column to the `profiles` table so we can match receivers by district without making N reverse-geocode API calls at notification time.

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS district text;
```

### 2. Frontend -- Save district to profile on location detection

**File: `src/pages/Dashboard.tsx`**

When the receiver's location is detected and reverse-geocoded, also save the district string to their profile alongside `latitude`/`longitude`. Update the two places where `reverseGeocode` is called:

- **Location granted path** (~line 166): After saving lat/lng, also save the district:
  ```typescript
  await supabase.from('profiles').update({
    latitude: loc.lat,
    longitude: loc.lng,
    district: district || null,
  }).eq('id', user.id);
  ```

- **Location denied fallback path** (~line 184): If a district is resolved from stored coords, save it too.

### 3. Edge Function -- Expand `notify-nearby-users` to include district matching

**File: `supabase/functions/notify-nearby-users/index.ts`**

Update the function to:

1. **Reverse-geocode** the donation's coordinates to determine its district (using Nominatim, same logic as the frontend).
2. **Query receivers** who match by district (`profiles.district`) OR are within 10km (existing logic), excluding the donor and users with push disabled.
3. **Deduplicate** users who match both criteria.
4. **Customize the notification message**: distance-based for nearby users (e.g., "1.2 km away"), district-based for farther users (e.g., "available in Hyderabad").

Key changes in the edge function:

```typescript
// 1. Reverse-geocode donation location to get district
async function getDistrict(lat: number, lng: number): Promise<string | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
    { headers: { 'Accept-Language': 'en' } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const addr = data?.address;
  return addr?.city || addr?.town || addr?.state_district || addr?.county || null;
}

// 2. Query profiles -- now also select `district`
const { data: allReceivers } = await supabase
  .from("profiles")
  .select("id, latitude, longitude, notification_push, user_type, district")
  .or("user_type.eq.receiver,user_type.eq.both");

// 3. Filter: include if within 10km OR same district
// 4. Deduplicate by user id
// 5. Customize message per user
```

### 4. Update the database trigger payload (no change needed)

The existing `notify_nearby_on_donation_insert()` trigger already passes `latitude`, `longitude`, and `title` to the edge function -- no changes required.

## How It Works (End-to-End Flow)

```text
Donor creates donation
        |
        v
DB trigger fires --> calls notify-nearby-users edge function
        |
        v
Edge function reverse-geocodes donation coords --> gets district name
        |
        v
Queries all receiver profiles with:
  - Same district (district-level reach)
  - OR within 10km radius (proximity reach)
        |
        v
Inserts notification rows --> Supabase Realtime picks them up
        |
        v
useNotifications hook receives INSERT event
  - Shows in-app toast notification
  - Shows browser push notification (if permitted)
```

## Files Modified
- **Database migration**: Add `district` column to `profiles`
- **`src/pages/Dashboard.tsx`**: Save district to profile when location is detected
- **`supabase/functions/notify-nearby-users/index.ts`**: Add district-based matching alongside existing radius-based matching
