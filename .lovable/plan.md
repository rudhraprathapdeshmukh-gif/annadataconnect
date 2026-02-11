

# Location-Based Filtering for Available Donations

## Overview
When a receiver opens the dashboard, the app will request their current location and show only donations within a 10 km radius. Filtering will happen at the database level using the Haversine formula for performance and security.

## What Changes

### 1. New Database Function: `get_nearby_donations`
Create a SQL function that accepts the receiver's latitude, longitude, and radius (default 10 km), then returns only donations within that radius using the Haversine formula. This function will replace `get_public_donations` for the receiver's "Available Food" tab.

- Returns the same masked columns as `get_public_donations` (hidden exact address, approximate lat/lng)
- Adds a `distance_km` column so donations can be sorted by proximity
- Filters: `status = 'available'`, `deleted_at IS NULL`, within radius
- Uses `SECURITY DEFINER` to maintain location masking

### 2. Dashboard State Changes
Add new state variables to track:
- `receiverLocation`: the receiver's current lat/lng (or null)
- `locationStatus`: `'loading' | 'granted' | 'denied' | 'unavailable'`
- `locationError`: error message string for UI feedback

### 3. Location Request on Load
When the receiver tab is active:
- Call `navigator.geolocation.getCurrentPosition()` on mount
- On success: store coordinates, call `get_nearby_donations` with those coordinates
- On denied/error: show a clear info banner explaining that location is needed, with a "Retry" button
- Also save coordinates to the user's profile (`profiles.latitude`, `profiles.longitude`) for the existing nearby-notification system

### 4. Updated `fetchDonations` Logic
- If receiver has location: call `supabase.rpc('get_nearby_donations', { p_lat, p_lng, p_radius_km: 10 })`
- If location denied/unavailable: show all donations as fallback (current behavior) with an info banner encouraging location access
- Sort results by distance (nearest first)
- Display distance on each donation card (e.g., "2.3 km away")

### 5. UI Updates to Available Food Tab
- Add a location status banner above the filter bar:
  - Loading: "Detecting your location..." with spinner
  - Denied: "Location access denied. Showing all donations. Enable location for nearby results." + Retry button
  - Granted: "Showing donations within 10 km" with a small location icon
- Add distance badge on each donation card when location is available
- Empty state message: "No donations found within 10 km. Try expanding your search." with a button to show all donations

### 6. Donation Form (Already Working)
The Donate page already stores `latitude` and `longitude` when the donor uses location or saved addresses -- no changes needed there.

## Technical Details

### Database Migration SQL

```sql
CREATE OR REPLACE FUNCTION public.get_nearby_donations(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  quantity text,
  quantity_unit text,
  food_type text,
  diet_type text,
  expiry_date timestamptz,
  status text,
  created_at timestamptz,
  rating integer,
  image_url text,
  approx_latitude numeric,
  approx_longitude numeric,
  masked_location text,
  distance_km double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    fd.id,
    fd.title,
    fd.description,
    fd.quantity,
    fd.quantity_unit,
    fd.food_type,
    fd.diet_type,
    fd.expiry_date,
    fd.status,
    fd.created_at,
    fd.rating,
    fd.image_url,
    ROUND(fd.latitude::numeric, 2) as approx_latitude,
    ROUND(fd.longitude::numeric, 2) as approx_longitude,
    CASE
      WHEN fd.pickup_location IS NOT NULL THEN
        regexp_replace(fd.pickup_location, '^[^,]+', 'Address hidden until approved')
      ELSE 'Location not available'
    END as masked_location,
    (6371 * acos(
      cos(radians(p_lat)) * cos(radians(fd.latitude)) *
      cos(radians(fd.longitude) - radians(p_lng)) +
      sin(radians(p_lat)) * sin(radians(fd.latitude))
    )) as distance_km
  FROM food_donations fd
  WHERE fd.status = 'available'
    AND fd.deleted_at IS NULL
    AND fd.latitude IS NOT NULL
    AND fd.longitude IS NOT NULL
    AND (6371 * acos(
      cos(radians(p_lat)) * cos(radians(fd.latitude)) *
      cos(radians(fd.longitude) - radians(p_lng)) +
      sin(radians(p_lat)) * sin(radians(fd.latitude))
    )) <= p_radius_km
  ORDER BY distance_km ASC;
$$;
```

### Files Modified
- **`src/pages/Dashboard.tsx`**: Add location detection, update `fetchDonations` to use RPC when location available, add location banner UI, add distance display on cards
- **`src/lib/geoUtils.ts`**: No changes needed (already has Haversine -- only used client-side for geofencing)

### Error Handling Summary
| Scenario | Behavior |
|----------|----------|
| Location granted | Show nearby donations sorted by distance |
| Location denied | Show all donations with info banner + retry button |
| Geolocation not supported | Show all donations with info message |
| No donations within 10 km | Show empty state with "Show all" button |
| Location loading | Show spinner/skeleton while detecting |
