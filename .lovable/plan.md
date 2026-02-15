
# Reorganize Receiver Dashboard Layout

## Overview
Restructure the receiver's "Available Food" tab to follow a clear top-down hierarchy: control bar (distance + map actions) -> map -> filters -> donation cards. Replace the distance dropdown with inline radius buttons (1km, 2km, 5km, 10km, 15km, 20km).

## Changes

### `src/pages/Dashboard.tsx` - Receiver Section (lines ~1098-1411)

**1. Replace distance dropdown with radius buttons**
- Remove the `Select` component for distance (lines 1168-1178)
- Replace with a row of pill buttons: 1km, 2km, 5km, 10km, 15km, 20km
- Active button gets `bg-primary text-primary-foreground`, inactive gets `bg-muted text-muted-foreground`
- Update default `searchRadius` from `10` to `5`

**2. Restructure the "Available Food" TabsContent layout**

Current order (scattered):
- Location status banners (loading/denied/unavailable/granted) mixed together
- Map
- Diet filter
- Cards

New order (clean vertical hierarchy):

```
+--------------------------------------------------+
| [Available Food]  [My Requests]    <- Tabs        |
+--------------------------------------------------+
| Location Status (loading/denied/unavailable)      |
+--------------------------------------------------+
| Control Bar (when location granted):              |
| [Nav icon] Showing nearby   [1] [2] [5] [10]...  |
|                    [Hide Map] [Show All]           |
+--------------------------------------------------+
| Map (collapsible)                                 |
+--------------------------------------------------+
| Filters: [All] [Veg] [Non-Veg]                   |
+--------------------------------------------------+
| Donation Cards Grid                               |
+--------------------------------------------------+
```

- The control bar combines the distance selector and map/show-all actions in one unified row
- Map sits below the control bar as a context section
- Diet filters clearly sit above the results grid
- All sections have consistent spacing using `space-y-4`

**3. Control bar styling**
- Use a subtle `bg-muted/30 rounded-xl p-4` container
- Distance buttons in a flex-wrap row with `gap-1.5`
- Map toggle and "Show All" buttons right-aligned on the same row
- On mobile, the buttons wrap naturally

**4. Clean up unused imports**
- Remove `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` imports if not used elsewhere in the file (check donor section first)

## Technical Details

### Files Modified
- **`src/pages/Dashboard.tsx`**: Restructure receiver tab content order, replace Select dropdown with radius buttons, update default searchRadius to 5

### No database changes needed.
