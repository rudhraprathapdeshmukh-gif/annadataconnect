

# Fix: Donor Cannot Rate Receiver + Display Ratings on Both Profiles

## Issue 1: Donor Cannot Rate the Receiver

### Root Cause
The RLS policy **"Donors can update requests for their donations"** on `food_requests` restricts updates to requests with `status IN ('pending', 'approved')`:

```sql
USING: status = ANY (ARRAY['pending', 'approved'])
WITH CHECK: status = ANY (ARRAY['pending', 'approved', 'rejected'])
```

When a donor tries to submit a `donor_rating` on a **completed** request, the update is silently rejected because `'completed'` is not in the allowed statuses.

There IS a policy for receivers: **"Receivers can rate completed requests"** which allows `requester_id = auth.uid() AND status = 'completed'`. But there is no equivalent policy for donors.

### Fix
Add a new RLS policy that allows donors to rate completed requests:

```sql
CREATE POLICY "Donors can rate completed requests"
ON public.food_requests FOR UPDATE
TO authenticated
USING (
  status = 'completed'
  AND donation_id IN (
    SELECT id FROM food_donations WHERE donor_id = auth.uid()
  )
)
WITH CHECK (
  status = 'completed'
  AND donation_id IN (
    SELECT id FROM food_donations WHERE donor_id = auth.uid()
  )
);
```

## Issue 2: Profile Rating Display

The rating display is already present in both the own-profile and other-user-profile sections (confirmed in Profile.tsx lines 248-253 and 343-349). Both sections show the average rating and total ratings count. No UI changes are needed here -- the rating display will work correctly once the donor can actually submit ratings (which populates the data).

## Summary of Changes

| File | Change |
|------|--------|
| Database migration | Add "Donors can rate completed requests" RLS policy on `food_requests` |

This is a single migration fix. No frontend code changes are needed -- the rating submission logic in Dashboard.tsx and display in Profile.tsx are already correct. The only blocker was the missing RLS policy preventing the database UPDATE from succeeding.

