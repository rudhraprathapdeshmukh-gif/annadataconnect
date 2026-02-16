

# Add Google Maps Link to Pickup Details

## Change
Add a "Get Directions" link below the pickup location in `src/components/RequestCard.tsx` that opens Google Maps with directions to the donor's location.

## Technical Detail

In `src/components/RequestCard.tsx`, after the pickup location `MapPin` line (~line 199), add a link that encodes the pickup address into a Google Maps directions URL:

```typescript
<a
  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(request.food_donations.pickup_location)}`}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-1.5 text-primary hover:underline text-xs mt-1"
>
  <MapPin className="h-3 w-3" />
  Open in Google Maps
</a>
```

## Files Modified
- `src/components/RequestCard.tsx` -- Add Google Maps directions link in the Pickup Details section

