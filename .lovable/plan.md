

# Plan: Change "Pickup by" to "Approx. Expiry" on Dashboard

## Issue
The food donation card on the Dashboard displays **"Pickup by: 2/6/2026 at 8:30 AM"** but this is actually showing the expiry date. To be consistent with the donation form, it should display **"Approx. Expiry:"** instead.

## Current State
- Line 1134 in `Dashboard.tsx` shows: `Pickup by: {date} at {time}`
- The comment on line 1130 already says "Expiry Date" which confirms this is meant to be expiry, not pickup

## Solution

### File: `src/pages/Dashboard.tsx`

**Change line 1134:**
```
Before: <span>Pickup by: {new Date(donation.expiry_date)...
After:  <span>Approx. Expiry: {new Date(donation.expiry_date)...
```

## Result
- Dashboard cards will display "Approx. Expiry: 2/6/2026 at 8:30 AM"
- Consistent terminology across the entire application (donation form and dashboard)

