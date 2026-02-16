
# Make Map Interactive Only On Click

## Overview
Start the map in a non-interactive (locked) state so users can scroll the page without accidentally panning/zooming the map. When the user clicks on the map, it activates interactions. Clicking outside the map deactivates them again. A subtle overlay hint ("Click to interact") is shown when the map is locked.

## Changes

### `src/components/DonationMap.tsx`

**1. Initialize map with interactions disabled**
- Set `dragging: false`, `scrollWheelZoom: false`, `doubleClickZoom: false`, `touchZoom: false`
- Keep `zoomControl: true` (zoom buttons always work)

**2. Enable interactions on click**
- Add a `click` event listener on the map that enables `dragging`, `scrollWheelZoom`, `doubleClickZoom`, and `touchZoom`
- Add an outline/border style change to indicate the map is active

**3. Disable interactions when clicking outside**
- Add a `mousedown` event listener on `document` that checks if the click target is outside the map container
- If outside, disable all interactions again and remove the active styling

**4. Show "Click to interact" overlay**
- Add a `useState` for `isActive` (default `false`)
- When `isActive` is false, render a semi-transparent overlay with "Click to interact" text
- When the map is clicked, set `isActive` to true and hide the overlay
- When clicking outside, set `isActive` to false and show the overlay again

### Technical Details

```text
State: isActive = false
  -> Map renders with overlay "Click to interact"
  -> dragging/zoom disabled
  -> User clicks map
State: isActive = true
  -> Overlay hidden
  -> dragging/zoom enabled
  -> User clicks outside map
State: isActive = false (back to locked)
```

**Files modified:** `src/components/DonationMap.tsx` only.

No database changes needed.
