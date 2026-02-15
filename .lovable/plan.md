
# Make the Receiver Map Interactive

## Overview
Currently the map is fully static -- all interactions (dragging, zooming, scrolling) are disabled. This plan enables interactivity so receivers can pan, zoom, and tap on donation markers to see details.

## Changes

### `src/components/DonationMap.tsx`

**1. Enable map interactions**
- Remove the disabled flags: set `dragging: true`, `scrollWheelZoom: true`, `doubleClickZoom: true`, `touchZoom: true`
- Add `zoomControl: true` so users can zoom in/out with +/- buttons

**2. Make the map taller**
- Change height from `h-48` to `h-64` to give more room for interaction

**3. Add clickable popups on donation markers**
- Replace `bindTooltip` on donation markers with `bindPopup` showing the donation title and distance (e.g., "Rice - 2 servings\n1.2 km away")
- Keep the "You" tooltip on the user marker as-is (hover is fine for that)

**4. Add an `onDonationClick` callback (optional enhancement)**
- Accept an optional `onDonationClick?: (id: string) => void` prop
- When a donation marker popup is opened, include a small "View" link that calls the callback
- This lets the Dashboard scroll to or highlight the corresponding card

**5. Fit bounds to show all markers**
- After adding all markers, use `map.fitBounds()` on a group containing the user marker and all donation markers, with some padding
- Fall back to the radius-based zoom if there are no donation markers

### No other files need changes -- the Dashboard already passes the required props.
