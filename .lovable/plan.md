

# Suspend Donors After 5 Low-Rated Donations

## Overview
If a donor continues to receive ratings of 2 or below even after 5 completed donations (not just 3), their account will be suspended for 48 hours. During suspension, the donor cannot create new donations and sees a clear error message explaining why they are suspended and when the suspension lifts.

## Implementation

### 1. Add `suspended_until` column to `profiles` table

A new nullable `timestamp with time zone` column called `suspended_until` will be added to the `profiles` table. When set to a future timestamp, the donor is considered suspended.

### 2. Extend `checkDonorLowRatings` in `src/pages/Dashboard.tsx`

After checking the last 3 ratings (existing warning logic), add a second check for the last 5 ratings:

- Fetch the last 5 `receiver_rating` values for the donor's donations
- If all 5 are <= 2, update the donor's profile to set `suspended_until` to `now() + 48 hours`
- Also insert a notification of type `'account_suspended'` informing them

### 3. Block donation creation in `src/pages/Donate.tsx`

On page load, fetch the current user's `suspended_until` from their profile. If it is in the future:
- Display a prominent error/alert banner with the message: "Your account has been suspended due to consistently low ratings on your donations. Please ensure food quality and hygiene standards. Your suspension will be lifted on [date/time]."
- Disable the donation form entirely

### 4. Database migration

- Add `suspended_until` column to `profiles`
- Add `'account_suspended'` to the `notifications` type check constraint

## Technical Details

### Database Migration

```sql
-- Add suspended_until to profiles
ALTER TABLE public.profiles ADD COLUMN suspended_until timestamptz DEFAULT NULL;

-- Update notifications type constraint
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('nearby_donation', 'request_approved', 'donation_cancelled', 'donation_expired', 'message_received', 'low_rating_warning', 'account_suspended'));
```

### Changes to `src/pages/Dashboard.tsx` - `checkDonorLowRatings`

After the existing 3-rating warning logic, add:

```typescript
// Check for suspension: last 5 ratings all <= 2
if (recentRatings.length >= 5 || /* re-fetch with limit 5 */) {
  const { data: last5 } = await supabase
    .from('food_requests')
    .select('receiver_rating')
    .in('donation_id', donations.map(d => d.id))
    .not('receiver_rating', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (last5 && last5.length >= 5 && last5.every(r => (r.receiver_rating ?? 0) <= 2)) {
    // Check not already suspended
    const { data: profile } = await supabase
      .from('profiles')
      .select('suspended_until')
      .eq('id', donorId)
      .single();

    if (!profile?.suspended_until || new Date(profile.suspended_until) < new Date()) {
      const suspendUntil = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      await supabase.from('profiles').update({ suspended_until: suspendUntil }).eq('id', donorId);

      await supabase.from('notifications').insert({
        user_id: donorId,
        type: 'account_suspended',
        title: 'Account Suspended',
        message: 'Your account has been suspended for 48 hours due to consistently low ratings...',
      });
    }
  }
}
```

### Changes to `src/pages/Donate.tsx`

```typescript
const [suspendedUntil, setSuspendedUntil] = useState<string | null>(null);

useEffect(() => {
  if (user) {
    supabase.from('profiles').select('suspended_until').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.suspended_until && new Date(data.suspended_until) > new Date()) {
          setSuspendedUntil(data.suspended_until);
        }
      });
  }
}, [user]);

// In render, if suspendedUntil is set, show alert and block form
```

The alert will use the existing `Alert` component with a destructive variant showing the suspension reason and end time.

## Files Modified

| File | Change |
|------|--------|
| Database migration | Add `suspended_until` column to `profiles`; update notification type constraint |
| `src/pages/Dashboard.tsx` | Extend `checkDonorLowRatings` to suspend after 5 low ratings |
| `src/pages/Donate.tsx` | Check suspension status on load; show error and block form if suspended |

