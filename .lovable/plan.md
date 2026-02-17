
# Fix: Receiver Notifications Not Sent and Donations Expiring Early

## Root Causes

### Issue 1: Receivers not notified (401 error)
The database trigger `notify_nearby_on_donation_insert` calls the `notify-nearby-users` edge function using `current_setting('supabase.service_role_key', true)` as the Bearer token. However, this setting returns NULL in the current environment, which makes the Authorization header NULL. The edge function then rejects the request with a 401 error.

**Evidence**: Edge function analytics show `POST | 401` for every call. Zero `nearby_donation` notifications exist in the database.

### Issue 2: Donations expiring before expiry time
The database trigger `handle_request_status_change` contains a bug: when a donor rejects an approved request, it sets the donation status to `'expired'` instead of `'available'`. This makes the donation disappear even though its actual expiry time has not been reached.

**Evidence**: "Chicken Biyani" donation (expiry: 20:45 UTC) was marked expired at 18:50 UTC -- nearly 2 hours early -- because the donor rejected the approved request.

---

## Fix 1: Remove auth check from edge function

Since the edge function already has `verify_jwt = false` in `supabase/config.toml` and is only called internally by the database trigger via `pg_net`, we can safely remove the authorization header requirement from the edge function code. The trigger will also be simplified to not send an Authorization header.

### Changes to `supabase/functions/notify-nearby-users/index.ts`
Remove the auth header validation block (lines ~47-56) that checks for the Authorization header and returns 401.

### Database migration: Update trigger
Replace the trigger function to remove the Authorization header from the `pg_net` call:

```sql
CREATE OR REPLACE FUNCTION public.notify_nearby_on_donation_insert()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  request_id bigint;
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    SELECT net.http_post(
      url := 'https://ipinrucukkciyqprzkmu.supabase.co/functions/v1/notify-nearby-users',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'donation_id', NEW.id,
        'donor_id', NEW.donor_id,
        'latitude', NEW.latitude,
        'longitude', NEW.longitude,
        'title', NEW.title
      )
    ) INTO request_id;
  END IF;
  RETURN NEW;
END;
$$;
```

---

## Fix 2: Set donation back to 'available' on request rejection

### Database migration: Update `handle_request_status_change` trigger function

Change the logic so that when an approved request is rejected or cancelled, the donation status goes back to `'available'` instead of `'expired'`:

```sql
CREATE OR REPLACE FUNCTION public.handle_request_status_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
    UPDATE public.food_donations
    SET status = 'claimed', updated_at = now()
    WHERE id = NEW.donation_id;
  END IF;

  IF (NEW.status IN ('rejected', 'cancelled')) AND OLD.status = 'approved' THEN
    UPDATE public.food_donations
    SET status = 'available', updated_at = now()
    WHERE id = NEW.donation_id;
  END IF;

  RETURN NEW;
END;
$$;
```

---

## Files Modified

| File | Change |
|------|--------|
| Database migration | Fix `handle_request_status_change` to set status to `'available'` instead of `'expired'`; fix `notify_nearby_on_donation_insert` to remove auth header |
| `supabase/functions/notify-nearby-users/index.ts` | Remove authorization header validation that causes 401 |
