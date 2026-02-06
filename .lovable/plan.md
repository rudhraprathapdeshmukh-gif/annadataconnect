
# Plan: Show Donor's Actual Name in Chat Header

## Problem
In `RequestCard.tsx`, the chat dialog passes a hardcoded `"Donor"` string as the `otherUserName` prop instead of showing the actual donor's name.

## Current State
- Line 383 in `RequestCard.tsx`: `otherUserName="Donor"` (hardcoded)
- The donor's profile data (`donor_profile`) is already fetched and available via `request.food_donations.donor_profile`
- This data is already used elsewhere in the same component (e.g., line 285 for donor contact info)

## Solution

### File: `src/components/RequestCard.tsx`

**Change line 383** from:
```
otherUserName="Donor"
```
to:
```
otherUserName={request.food_donations.donor_profile
  ? `${request.food_donations.donor_profile.first_name} ${request.food_donations.donor_profile.last_name}`
  : 'Donor'}
```

This follows the same pattern already used in `Dashboard.tsx` (lines 1604 and 1628) for showing receiver names.

## Result
- The chat header will display "with [Donor's First Name] [Donor's Last Name]" instead of "with Donor"
- Falls back to "Donor" if profile data is unavailable
- No database or schema changes needed
