

# Fix: "Show All in [District]" Not Displaying Donations

## Root Cause

The reverse geocoding API (Nominatim) returns `"Hanumakonda"` as the district for the user's coordinates, but the donation's `pickup_location` field contains `"Warangal"` (e.g., "Chinnys Hostel, Rangampet, Warangal"). The SQL `ILIKE '%Hanumakonda%'` filter does not match `"Warangal"`, so zero results are returned.

This is a district name mismatch: the administrative district name ("Hanumakonda") differs from the commonly used city/area name ("Warangal") stored in the pickup location text.

## Solution

Use **coordinate-based filtering** instead of text matching. When "Show All in [District]" is clicked, use a larger radius (e.g., 50 km) via the existing `get_nearby_donations` RPC rather than relying on matching district names in text. This approach is more reliable because it does not depend on matching place names.

Additionally, improve the district display name by checking multiple address fields from Nominatim to pick the most recognizable name for the user.

## Changes

### 1. `src/pages/Dashboard.tsx` - Update `fetchDonations`

Replace the district-based RPC call with a large-radius nearby query:

- When `showAllDonations` is true and `receiverLocation` is available, call `get_nearby_donations` with a 50 km radius instead of calling `get_district_donations`
- When `showAllDonations` is true but no location is available, fall back to showing all donations globally (existing behavior)
- Remove the `get_district_donations` RPC call entirely from the frontend

The logic becomes:
```
if (receiverLocation && !showAllDonations) -> nearby with user-selected radius
else if (receiverLocation && showAllDonations) -> nearby with 50km radius  
else -> all donations globally
```

### 2. `src/lib/geoUtils.ts` - Improve district name detection

Update `reverseGeocode` to prefer the most user-friendly name. Try `city` or `town` before `state_district`, since those tend to match what people actually call the area:

```
return address.city || address.town || address.state_district || address.county || null;
```

### 3. UI label update

Update the "Show All" button and banner to say "Show all in [District]" and "Showing all donations in [District]" using the improved district name.

### 4. Remove unused database function

The `get_district_donations` database function can be dropped since we are switching to coordinate-based filtering, which is more reliable.

## Technical Details

### Files Modified
- **`src/pages/Dashboard.tsx`**: Change "Show All" fetch logic from district RPC to large-radius nearby query
- **`src/lib/geoUtils.ts`**: Reorder address field priority for better display names

### Why Not Fix the Text Matching?
Text matching between Nominatim results and user-entered pickup locations is inherently fragile. Users may enter "Warangal" while the official district is "Hanumakonda". Coordinate-based filtering is deterministic and always works regardless of naming conventions.
