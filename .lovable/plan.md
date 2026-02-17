

# Fix: Donations Auto-Rejected While Still Claimed

## Root Cause

In `src/pages/Dashboard.tsx` (lines 653-668), the donor dashboard fetch logic auto-rejects approved requests using a **hardcoded 10-minute timeout**:

```javascript
const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
const { data: expiredRequests } = await supabase
  .from('food_requests')
  .select('id')
  .eq('status', 'approved')
  .lt('accepted_at', tenMinutesAgo)
  .in('donation_id', donationIds);
```

However, when a request is approved, the `timer_duration` is set to **30 minutes** (and can be extended to 40, 50, or 60 minutes via extensions). The 10-minute cutoff prematurely rejects legitimate pickups that are still within their allowed time.

When the request is rejected, the `handle_request_status_change` trigger resets the donation to `'available'`, making it appear as though the donation expired.

## Fix

Replace the hardcoded 10-minute auto-reject with per-request timer-aware logic:

1. Fetch approved requests with their `accepted_at` and `timer_duration` fields
2. Filter client-side to find only those that have truly exceeded their timer
3. Reject only the genuinely expired ones

### Changes to `src/pages/Dashboard.tsx`

Replace lines 653-668 with:

```javascript
// 3) Auto-reject expired approved requests (past their timer_duration)
const { data: approvedRequests } = await supabase
  .from('food_requests')
  .select('id, accepted_at, timer_duration')
  .eq('status', 'approved')
  .in('donation_id', donationIds);

const now = Date.now();
const expiredRequestIds = (approvedRequests || [])
  .filter(r => {
    if (!r.accepted_at) return false;
    const timerMs = (r.timer_duration || 30) * 60 * 1000;
    return now > new Date(r.accepted_at).getTime() + timerMs;
  })
  .map(r => r.id);

if (expiredRequestIds.length > 0) {
  await supabase
    .from('food_requests')
    .update({ status: 'rejected' })
    .in('id', expiredRequestIds);

  toast.info(`${expiredRequestIds.length} expired request(s) automatically rejected`);
}
```

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Replace hardcoded 10-minute auto-reject with timer_duration-aware logic |
