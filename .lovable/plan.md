

# Make Current Location Compulsory for Donors

## Overview
Simplify the pickup location section so donors must use their current GPS location. Remove manual address fields and saved address selection entirely.

## Changes

### 1. `src/components/DonateFormStep2.tsx`
- Remove the "Saved Address" dropdown and related props
- Remove the manual City, Area, and Complete Address input fields
- Keep only the "Current Location" button
- After location is detected, show the auto-filled address as read-only text (not editable inputs)
- Show a success state with the detected address after clicking "Current Location"

### 2. `src/pages/Donate.tsx`
- Remove `savedAddresses`, `selectedSavedAddress`, `fetchSavedAddresses`, `handleSelectSavedAddress` state and logic
- Remove the `savedAddresses` and `selectedSavedAddress` props passed to `DonateFormStep2`
- Auto-trigger `handleUseCurrentLocation` when step 2 loads (so the user is prompted immediately)
- Remove Zod validation for `city`, `area`, `complete_address` (these will be auto-filled, always present after location detection)
- Add a check: block form submission if coordinates are not set (location not detected)

### 3. `DonateFormStep2Props` interface update
Remove these props:
- `savedAddresses`
- `selectedSavedAddress`
- `onSelectSavedAddress`

Remove `formData`/`setFormData` for location fields (city, area, complete_address) since they become read-only auto-filled values.

### 4. UI after location detection
Once "Current Location" is clicked and address is resolved:
- Hide the button (or show it as "Re-detect Location")
- Display the detected address as a styled read-only block:
  ```
  [MapPin icon] Detected Location
  "Road name, Area, City"
  ```
- If location fails, show error with retry button

## Technical Details

### Files Modified
- **`src/components/DonateFormStep2.tsx`**: Remove saved address dropdown, manual address inputs; show read-only detected address
- **`src/pages/Donate.tsx`**: Remove saved address state/fetching, remove manual address validation, enforce coordinates before submit

