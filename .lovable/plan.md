
# Use Coordinates for Google Maps Link

## Problem
The current "Open in Google Maps" link uses the text address, which may not resolve to the exact donor location. The `food_donations` table already has `latitude` and `longitude` columns, and they are already fetched (via `food_donations(*)` in the query).

## Changes

### 1. `src/components/RequestCard.tsx`

**Add coordinates to the FoodDonation interface:**
```typescript
interface FoodDonation {
  // ...existing fields...
  latitude?: number | null;
  longitude?: number | null;
}
```

**Update the Google Maps link** to use coordinates when available, falling back to address:
```typescript
<a
  href={
    request.food_donations.latitude && request.food_donations.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${request.food_donations.latitude},${request.food_donations.longitude}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(request.food_donations.pickup_location)}`
  }
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-1.5 text-primary hover:underline text-xs mt-1"
>
  <MapPin className="h-3 w-3" />
  Open in Google Maps
</a>
```

## Files Modified
- `src/components/RequestCard.tsx` -- Add `latitude`/`longitude` to interface and use coordinates in Google Maps URL
