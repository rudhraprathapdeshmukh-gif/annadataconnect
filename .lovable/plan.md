
# Show Accurate Donation Locations on Map

## Problem
Currently, donation markers on the map use coordinates rounded to 2 decimal places (about 1 km accuracy). This is because the `get_nearby_donations` database function intentionally rounds coordinates for privacy when showing donations to unauthenticated or general views. However, for the map to be useful, receivers need to see more precise locations.

## Solution
Update the `get_nearby_donations` database function to return higher-precision coordinates (4 decimal places, roughly 11-meter accuracy) alongside the existing approximate ones. Then update the Dashboard to use these precise coordinates for map markers.

## Changes

### 1. Database Migration
Update the `get_nearby_donations` function to return `map_latitude` and `map_longitude` rounded to 4 decimal places (about 11m accuracy -- good enough for the map without revealing the exact address).

### 2. `src/pages/Dashboard.tsx`
- Use the new `map_latitude` / `map_longitude` fields (4 decimal places) when passing donation data to the DonationMap component
- Keep using `approx_latitude` / `approx_longitude` for any other display purposes

### Technical Details

**Database function change:**
The `get_nearby_donations` function will add two new return columns:
- `map_latitude` -- `ROUND(fd.latitude::numeric, 4)` (11m precision)
- `map_longitude` -- `ROUND(fd.longitude::numeric, 4)` (11m precision)

**Dashboard mapping change:**
```
latitude: d.map_latitude ? Number(d.map_latitude) : undefined,
longitude: d.map_longitude ? Number(d.map_longitude) : undefined,
```

No changes needed to `DonationMap.tsx` -- it already uses the `latitude`/`longitude` fields from the donations array.
