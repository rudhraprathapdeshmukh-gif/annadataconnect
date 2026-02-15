

# Remove Saved Addresses from Donor Profile

## Overview
Since donors now must use their current GPS location when donating (manual address entry was removed), the "Saved Addresses" section on the profile page is no longer needed. This plan removes it entirely.

## Changes

### `src/pages/Profile.tsx`

**Remove state variables:**
- `savedAddresses`, `showAddressForm`, `editingAddress`, `addressFormData`, `loadingLocation`, `deleteConfirmAddress`

**Remove functions:**
- `fetchSavedAddresses`
- `handleUseCurrentLocation`
- `handleSaveAddress`
- `handleEditAddress`
- `handleDeleteAddress`
- `handleSetDefaultAddress`

**Remove from `useEffect`:**
- The `fetchSavedAddresses()` call inside the profile fetch effect

**Remove UI sections:**
- The entire "Saved Addresses" block (lines 543-630) including the address list, add/edit form, and buttons
- The "Delete Address Confirmation" AlertDialog (lines 636-652)

**Remove unused imports:**
- `SavedAddress` type from `@/types/savedAddress`
- Icons no longer used: `MapPin`, `Loader2`, `Trash2`, `Edit`, `Plus`, `Home`
- `Input`, `Textarea` components (if no longer used elsewhere in the file)

This is a straightforward removal with no impact on other features since the donation form already uses GPS-only location detection.

