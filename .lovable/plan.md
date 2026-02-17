

# Warn Donors with Low Ratings

## Overview
After a receiver submits a rating for a donor, check if the donor has received ratings of 2 or below on their last 3 completed orders. If so, send a warning notification to the donor.

## Implementation

### 1. Add a check function after rating submission in `src/pages/Dashboard.tsx`

After `handleGlobalRatingSubmit` succeeds and the rating type is `'receiver'` (meaning a receiver just rated a donor), call a new function `checkDonorLowRatings` that:

1. Gets the donor's ID from the pending rating context
2. Fetches the donor's last 3 completed requests that have a `receiver_rating`
3. If all 3 ratings are <= 2, insert a warning notification into the `notifications` table for the donor

### 2. New helper function `checkDonorLowRatings`

Location: Inside `src/pages/Dashboard.tsx` (near the rating submission logic)

```typescript
const checkDonorLowRatings = async (donorId: string) => {
  // Get the donor's donations
  const { data: donations } = await supabase
    .from('food_donations')
    .select('id')
    .eq('donor_id', donorId);

  if (!donations || donations.length === 0) return;

  // Get last 3 receiver_ratings for this donor's donations
  const { data: recentRatings } = await supabase
    .from('food_requests')
    .select('receiver_rating')
    .in('donation_id', donations.map(d => d.id))
    .not('receiver_rating', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(3);

  if (!recentRatings || recentRatings.length < 3) return;

  // Check if all 3 are <= 2
  const allLow = recentRatings.every(r => r.receiver_rating! <= 2);
  if (!allLow) return;

  // Send warning notification to donor
  await supabase.from('notifications').insert({
    user_id: donorId,
    type: 'low_rating_warning',
    title: 'Low Rating Warning',
    message: 'Your recent food donations received low ratings in multiple orders. Please ensure food quality and hygiene standards. Continued low ratings may restrict your account.',
  });
};
```

### 3. Call the check after rating submission

In `handleGlobalRatingSubmit`, after successful update, if `pendingRating.type === 'receiver'` (receiver rating a donor), call `checkDonorLowRatings(donorId)`.

The donor ID is available from the request's donation data.

### 4. Add notification type to database constraint

The `notifications` table has a check constraint on the `type` column. We need to add `'low_rating_warning'` to the allowed values.

### 5. Prevent duplicate warnings

Add a check before inserting the notification: query if a `low_rating_warning` notification already exists for this donor in the last 7 days. If so, skip sending another one.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Add `checkDonorLowRatings` function; call it after receiver submits a rating |
| Database migration | Add `'low_rating_warning'` to the notification type check constraint |

