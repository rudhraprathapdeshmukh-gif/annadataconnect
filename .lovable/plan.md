

# Auto-Detect Receiver's District for "Show All" Filtering

## Overview
Instead of showing ALL donations globally when "Show All" is clicked (or location is denied), the app will auto-detect the receiver's district using reverse geocoding and only show donations within that district.

## How It Works

1. **Auto-detect district**: When the receiver's location is obtained, call the OpenStreetMap Nominatim reverse geocoding API to get their district/city name (e.g., "Warangal", "Hanumakonda").

2. **Store district in state**: Save the detected district name so it can be used for filtering and displayed in the UI.

3. **Filter "Show All" by district**: When "Show All" is clicked, instead of fetching every available donation, query donations where `pickup_location` contains the detected district name (case-insensitive match using `ILIKE`).

4. **Fallback for denied location**: If location is denied, try to detect district from the user's saved profile coordinates. If no coordinates are available at all, fall back to showing all donations as before.

## What Changes

### 1. New utility function: `reverseGeocode`
A small helper in `src/lib/geoUtils.ts` that calls the Nominatim API:
```
GET https://nominatim.openstreetmap.org/reverse?lat=X&lon=Y&format=json
```
Extracts the district/city from `address.state_district` or `address.city` fields.

### 2. Dashboard state additions
- `receiverDistrict`: string or null -- the auto-detected district name
- Update the `requestLocation` success handler to also call `reverseGeocode` and store the district

### 3. Updated `fetchDonations` logic
- **Nearby mode** (current behavior): Uses `get_nearby_donations` RPC -- no change
- **"Show All" mode** (new behavior): Creates a new database function `get_district_donations(p_district text)` that filters donations where `pickup_location ILIKE '%' || p_district || '%'`, with location masking. Falls back to all donations if no district is detected.

### 4. New database function: `get_district_donations`
A `SECURITY DEFINER` function similar to `get_public_donations` but with a district filter:
```sql
CREATE OR REPLACE FUNCTION public.get_district_donations(p_district text)
RETURNS TABLE(
  id uuid, title text, description text, quantity text,
  quantity_unit text, food_type text, diet_type text,
  expiry_date timestamptz, status text, created_at timestamptz,
  rating integer, image_url text,
  approx_latitude numeric, approx_longitude numeric,
  masked_location text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    fd.id, fd.title, fd.description, fd.quantity,
    fd.quantity_unit, fd.food_type, fd.diet_type,
    fd.expiry_date, fd.status, fd.created_at,
    fd.rating, fd.image_url,
    ROUND(fd.latitude::numeric, 2),
    ROUND(fd.longitude::numeric, 2),
    CASE WHEN fd.pickup_location IS NOT NULL
      THEN regexp_replace(fd.pickup_location, '^[^,]+', 'Address hidden until approved')
      ELSE 'Location not available'
    END
  FROM food_donations fd
  WHERE fd.status = 'available'
    AND fd.deleted_at IS NULL
    AND fd.pickup_location ILIKE '%' || p_district || '%'
  ORDER BY fd.created_at DESC;
$$;
```

### 5. UI updates
- Location banner updates to show detected district: "Showing donations in Warangal district"
- "Show All" button label changes to "Show all in [District]"
- Empty state for district mode: "No donations found in [District]"

## Technical Details

### Files Modified
- **New migration**: Creates `get_district_donations` function
- **`src/lib/geoUtils.ts`**: Add `reverseGeocode(lat, lng)` helper function
- **`src/pages/Dashboard.tsx`**: Add district state, call reverse geocode on location grant, update `fetchDonations` to use district filtering for "Show All" mode, update UI banners

### Reverse Geocoding (Nominatim)
- Free, no API key needed
- Rate limited to 1 request/second (only called once on location grant -- no issue)
- Returns structured address with `state_district`, `city`, `town`, `county` fields
- We extract district by checking `state_district` first, then `city`, then `county` as fallbacks

### Error Handling
| Scenario | Behavior |
|----------|----------|
| District detected + "Show All" | Show donations matching that district |
| Reverse geocode fails | Fall back to showing all donations globally |
| No donations in district | Empty state: "No donations in [District]" with option to show all globally |
| Location denied, profile has coords | Reverse geocode from profile coords for district |
| Location denied, no profile coords | Show all donations globally (existing behavior) |
