

# Fix Map Tiles Not Loading

## Problem
Map tiles (the actual street imagery from OpenStreetMap) are not rendering. The map shows the circle and markers on a blank dark background. This is caused by Tailwind CSS's preflight styles -- specifically `img { max-width: 100% }` and `img { height: auto }` -- which override Leaflet's internal tile image sizing, preventing tiles from displaying correctly.

## Solution
Add CSS overrides in `src/index.css` to restore Leaflet's expected styling for tile images and other internal elements. Also add an `invalidateSize()` call after the initial map render to ensure tiles load even if the container was briefly hidden.

## Changes

### 1. `src/index.css` -- Add Leaflet CSS fix
Add styles to override Tailwind's preflight for Leaflet elements:

```css
/* Fix Leaflet tiles broken by Tailwind's img reset */
.leaflet-pane,
.leaflet-tile,
.leaflet-marker-icon,
.leaflet-marker-shadow,
.leaflet-tile-container,
.leaflet-pane > svg,
.leaflet-pane > canvas,
.leaflet-zoom-box,
.leaflet-image-layer,
.leaflet-layer {
  position: absolute;
  left: 0;
  top: 0;
}

.leaflet-container img {
  max-width: none !important;
  max-height: none !important;
}

.leaflet-tile {
  filter: inherit;
  visibility: inherit;
}
```

### 2. `src/components/DonationMap.tsx` -- Add initial invalidateSize
Call `invalidateSize()` shortly after the map is created to ensure tiles load correctly on initial render (handles cases where the container size isn't fully settled):

```typescript
// After mapInstanceRef.current = map;
setTimeout(() => { map.invalidateSize(); }, 200);
```

## Files Modified
- `src/index.css` -- Add Leaflet CSS overrides
- `src/components/DonationMap.tsx` -- Add initial invalidateSize call
