
# Fix Map Tiles Not Loading After Click

## Problem
When clicking the "Click to interact" overlay, the overlay disappears and the map becomes interactive, but the map tiles (the actual street/satellite imagery) don't render -- only the markers and radius circle show on a blank dark background. This happens because Leaflet calculated the container dimensions while the overlay was present and doesn't re-check automatically.

## Solution
Call `map.invalidateSize()` after activating the map so Leaflet recalculates the container dimensions and loads tiles correctly. Apply this fix in all three places where the map is activated.

## Changes

### `src/components/DonationMap.tsx`

1. **In the map `click` event handler (line ~111-117)**: Add `map.invalidateSize()` after enabling interactions
2. **In the overlay `onClick` handler (line ~160-168)**: Add `map.invalidateSize()` after enabling interactions
3. **Wrap `invalidateSize` in a `setTimeout`** to ensure the DOM has updated (overlay removed) before Leaflet recalculates

### Technical Detail

```typescript
// In both activation handlers, after enabling interactions:
setTimeout(() => {
  map.invalidateSize();
}, 100);
```

This gives the browser a moment to re-render after the overlay is removed, then tells Leaflet to recalculate its container size and reload tiles.
