

## Plan: Fix item display in Requests section + show per-item expiry dates + improve card design

### Problem Summary
1. **DonorRequestCard (Requests tab)** only shows the parent `food_donations.image_url` and title -- it never fetches or displays individual `donation_items`, so multi-item donations show no photos or item details.
2. **Per-item expiry dates** are stored in `donation_items.expiry_date` but never fetched or displayed anywhere. The `DonationItem` interface and `fetchDonationItems` query both omit it.
3. **Card layout** needs improvement for readability.

### Changes

**1. Update `DonationItem` interface + `fetchDonationItems` query** (`Dashboard.tsx` ~line 37, ~line 477)
- Add `expiry_date: string | null` to the `DonationItem` interface
- Add `expiry_date` to the select query in `fetchDonationItems`

**2. Show per-item expiry in multi-item lists** (~lines 1186-1217 and ~lines 1632-1663)
- In both donor "Active Donations" and receiver "Available Donations" multi-item item rows, display the individual `item.expiry_date` formatted as date+time below the food type info

**3. Fetch and display donation items in DonorRequestCard** (~lines 1911-2084)
- Add a `useEffect` in `DonorRequestCard` to fetch `donation_items` for `request.donation_id` 
- Replace the single parent image with a multi-image grid (same pattern as active donations)
- Replace the single quantity line with the per-item list showing title, image, quantity, food type, diet badge, rating, and individual expiry

**4. Improve card styling**
- Better spacing, cleaner item rows with subtle borders
- Ensure consistent aspect ratios for images across all card types

### Files to modify
- `src/pages/Dashboard.tsx` — all changes above

