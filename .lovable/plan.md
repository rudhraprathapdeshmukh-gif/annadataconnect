

# Permanently Block Donors After 7 Consecutive Low Ratings

## Overview
If a donor receives ratings of 2 or below on their last 7 completed donations, their account will be permanently blocked. They will no longer be able to create donations and will see an error message explaining the permanent block.

## Implementation

### 1. Add `permanently_blocked` column to `profiles` table

A new boolean column `permanently_blocked` (default `false`) will be added to the `profiles` table. When set to `true`, the donor is permanently blocked.

Add `'account_blocked'` to the `notifications` type check constraint.

### 2. Extend `checkDonorLowRatings` in `src/pages/Dashboard.tsx`

After the existing 5-rating suspension check, add a third check for the last 7 ratings:

- Fetch the last 7 `receiver_rating` values for the donor's donations
- If all 7 are <= 2, set `permanently_blocked = true` on the donor's profile
- Insert an `account_blocked` notification informing them

### 3. Block donation creation in `src/pages/Donate.tsx`

Extend the existing suspension check to also fetch `permanently_blocked`. If `true`:
- Display a prominent error alert: "Your account has been permanently blocked due to consistently low ratings across 7 donations. You can no longer create donations. Please contact support if you believe this is an error."
- Hide the donation form entirely

### 4. Database migration

```sql
ALTER TABLE public.profiles ADD COLUMN permanently_blocked boolean DEFAULT false;

ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('nearby_donation', 'request_approved', 'donation_cancelled', 'donation_expired', 'message_received', 'low_rating_warning', 'account_suspended', 'account_blocked'));
```

## Technical Details

### Changes to `src/pages/Dashboard.tsx` - `checkDonorLowRatings`

After the existing suspension block (line ~356), add:

```typescript
// Check for permanent block: last 7 ratings all <= 2
const { data: last7 } = await supabase
  .from('food_requests')
  .select('receiver_rating')
  .in('donation_id', donations.map(d => d.id))
  .not('receiver_rating', 'is', null)
  .order('updated_at', { ascending: false })
  .limit(7);

if (last7 && last7.length >= 7 && last7.every(r => (r.receiver_rating ?? 0) <= 2)) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('permanently_blocked')
    .eq('id', donorId)
    .single();

  if (!profile?.permanently_blocked) {
    await supabase.from('profiles')
      .update({ permanently_blocked: true })
      .eq('id', donorId);

    await supabase.from('notifications').insert({
      user_id: donorId,
      type: 'account_blocked',
      title: 'Account Permanently Blocked',
      message: 'Your account has been permanently blocked due to consistently low ratings across 7 donations. You can no longer create donations. Please contact support if you believe this is an error.',
    });
  }
}
```

### Changes to `src/pages/Donate.tsx`

Update the existing suspension `useEffect` to also check `permanently_blocked`:

```typescript
const [permanentlyBlocked, setPermanentlyBlocked] = useState(false);

useEffect(() => {
  if (user) {
    supabase.from('profiles').select('suspended_until, permanently_blocked')
      .eq('id', user.id).single()
      .then(({ data }) => {
        if ((data as any)?.permanently_blocked) {
          setPermanentlyBlocked(true);
        } else if ((data as any)?.suspended_until && new Date((data as any).suspended_until) > new Date()) {
          setSuspendedUntil((data as any).suspended_until);
        }
      });
  }
}, [user]);
```

In the render, show a permanent block alert (taking priority over the suspension alert) with the message explaining the block is permanent.

## Files Modified

| File | Change |
|------|--------|
| Database migration | Add `permanently_blocked` column to `profiles`; update notification type constraint |
| `src/pages/Dashboard.tsx` | Extend `checkDonorLowRatings` to permanently block after 7 low ratings |
| `src/pages/Donate.tsx` | Check permanent block status on load; show error and hide form if blocked |

