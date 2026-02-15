

# Auto-Delete Expired Donations

## Overview
When a donation's expiry time passes, it should be automatically soft-deleted (using the existing `deleted_at` pattern) so it no longer appears in any listings. This will use a scheduled database job that runs every minute to clean up expired donations.

## Approach

### 1. Database Function: `auto_expire_donations`
Create a PL/pgSQL function that finds all donations where:
- `expiry_date` is in the past
- `status` is still `'available'`
- `deleted_at` IS NULL

For each matching donation, it will:
- Set `status` to `'expired'`
- Set `deleted_at` to `now()`
- Cancel any pending requests (set status to `'cancelled'`)
- Notify affected receivers via the `notifications` table

### 2. Scheduled Job (pg_cron)
Enable `pg_cron` and `pg_net` extensions, then schedule the function to run every minute:
```
cron.schedule('auto-expire-donations', '* * * * *', ...)
```

### 3. Frontend: Real-time Filtering
Add a client-side check in the Dashboard so that even before the cron runs, donations past their expiry are visually hidden or marked as expired. This provides instant feedback without waiting for the next cron cycle.

## Technical Details

### Database Migration

```sql
-- Enable pg_cron and pg_net
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to auto-expire donations
CREATE OR REPLACE FUNCTION public.auto_expire_donations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  expired_donation RECORD;
  request_record RECORD;
BEGIN
  FOR expired_donation IN
    SELECT id, title
    FROM food_donations
    WHERE expiry_date IS NOT NULL
      AND expiry_date < now()
      AND status = 'available'
      AND deleted_at IS NULL
  LOOP
    -- Soft-delete the donation
    UPDATE food_donations
    SET status = 'expired', deleted_at = now(), updated_at = now()
    WHERE id = expired_donation.id;

    -- Cancel pending requests and notify receivers
    FOR request_record IN
      SELECT id, requester_id
      FROM food_requests
      WHERE donation_id = expired_donation.id
        AND status IN ('pending', 'approved')
    LOOP
      UPDATE food_requests
      SET status = 'cancelled', updated_at = now()
      WHERE id = request_record.id;

      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (
        request_record.requester_id,
        'donation_expired',
        'Donation Expired',
        'The donation "' || expired_donation.title || '" has expired and is no longer available.',
        request_record.id
      );
    END LOOP;
  END LOOP;
END;
$$;
```

Then schedule it via a direct SQL insert (not a migration, since it contains project-specific URLs):
```sql
SELECT cron.schedule(
  'auto-expire-donations',
  '* * * * *',
  $$SELECT public.auto_expire_donations();$$
);
```

### Frontend Change: `src/pages/Dashboard.tsx`
- Filter out donations whose `expiry_date` is in the past from the displayed list (client-side safety net)
- This ensures expired items disappear immediately even if the cron hasn't run yet

### Files Modified
- **New migration**: Creates the `auto_expire_donations` function and enables extensions
- **SQL insert**: Schedules the cron job
- **`src/pages/Dashboard.tsx`**: Add client-side expiry filter
- **`src/pages/Index.tsx`**: Add same client-side expiry filter for the home page listing

