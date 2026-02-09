

# Fix: Reject Requests & Prevent Multiple Accepts

## Problems Identified

### 1. Cannot Reject Requests After One Is Accepted
When a donor accepts a request, the donation status changes to `claimed`. The RLS policy "Donors can update requests for their donations" blocks updates to pending requests when the donation is claimed -- it only allows updating `approved` rows. So rejecting other pending requests fails silently.

### 2. No Guard Against Accepting Multiple Requests
The `handleRequestAction` function does not check whether another request for the same donation is already approved. A donor can currently click "Accept" on multiple requests.

---

## Solution

### Step 1: Fix RLS Policy (Database Migration)

Update the "Donors can update requests for their donations" policy to also allow donors to **reject** pending requests even when the donation is claimed:

```text
Current USING condition:
  ... AND ((NOT is_donation_claimed(donation_id)) OR (status = 'approved'))

Updated USING condition:
  ... AND ((NOT is_donation_claimed(donation_id)) OR (status = 'approved') OR (status = 'pending'))
```

This allows donors to reject remaining pending requests after accepting one.

### Step 2: Auto-Reject Other Pending Requests on Accept (Frontend)

In `src/pages/Dashboard.tsx`, update the `handleRequestAction` function so that when a donor **accepts** a request:

1. Check if any other request for the same donation is already approved -- if so, block the accept with a toast message.
2. After successfully accepting, automatically reject all other **pending** requests for the same donation.
3. Send notifications to the rejected requesters informing them.

### Step 3: Disable Accept Button for Already-Claimed Donations (Frontend)

In the `DonorRequestCard` component within `Dashboard.tsx`, disable the "Accept" button if the donation already has an approved request (i.e., another request for the same `donation_id` in the `requests` array has `status === 'approved'`).

---

## Files to Modify

| File | Change |
|------|--------|
| Database migration (SQL) | Update RLS policy to allow rejecting pending requests on claimed donations |
| `src/pages/Dashboard.tsx` | Add auto-reject logic on accept; add guard against multiple accepts; disable Accept button when donation is already claimed |

## Technical Details

**RLS Policy SQL:**
```sql
DROP POLICY IF EXISTS "Donors can update requests for their donations" ON food_requests;
CREATE POLICY "Donors can update requests for their donations" ON food_requests
  FOR UPDATE USING (
    (auth.uid() IN (SELECT food_donations.donor_id FROM food_donations WHERE food_donations.id = food_requests.donation_id))
    AND (NOT has_completed_request(donation_id))
    AND ((NOT is_donation_claimed(donation_id)) OR (status = 'approved') OR (status = 'pending'))
  );
```

**Accept handler changes (pseudocode):**
```text
handleRequestAction('approved'):
  1. Find the donation_id from the request
  2. Check if any request for that donation_id already has status 'approved'
     -> If yes, show toast error "This donation already has an accepted request"
     -> Return early
  3. Update the request to 'approved' (existing logic)
  4. Fetch all other pending requests for the same donation_id
  5. Reject them all in bulk
  6. Send notification to each rejected requester
```
