

# Fix: In-App Notifications Not Working on Mobile

## Root Cause

The `notifications` table has **no INSERT RLS policy** for regular users. This means:

- **`request_approved`** notifications: WORK (created by `notify_request_approval` trigger with SECURITY DEFINER)
- **`message_received`** notifications: WORK (created by `notify_new_message` trigger with SECURITY DEFINER)  
- **`donation_requested`** notifications: FAIL SILENTLY (inserted from client-side JavaScript in Dashboard.tsx, blocked by RLS)

On mobile, the Supabase Realtime subscription for new notifications works fine -- but the notifications are never inserted in the first place because the client INSERT is rejected by RLS. The donor never gets notified when someone requests their food.

## Fix

Create a database trigger `notify_donation_requested()` that fires when a new row is inserted into `food_requests`. This runs as `SECURITY DEFINER` (bypassing RLS), looks up the donor and donation title, and inserts a `donation_requested` notification automatically.

Then remove the client-side notification insert from Dashboard.tsx since it's redundant (and broken due to RLS).

## Technical Details

### 1. Database Migration

Create trigger function and trigger:

```sql
CREATE OR REPLACE FUNCTION public.notify_donation_requested()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  donation_title text;
  v_donor_id uuid;
BEGIN
  SELECT title, donor_id INTO donation_title, v_donor_id
  FROM public.food_donations WHERE id = NEW.donation_id;

  IF v_donor_id IS NOT NULL AND v_donor_id != NEW.requester_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (
      v_donor_id,
      'donation_requested',
      'New Food Request!',
      'Someone has requested your donation: "' || COALESCE(donation_title, 'Unknown') || '"',
      NEW.donation_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_food_request_created
  AFTER INSERT ON public.food_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_donation_requested();
```

### 2. Dashboard.tsx Changes

Remove the client-side notification insert (lines 675-695 approximately) that tries to insert into the `notifications` table. The trigger now handles this automatically and reliably.

## Files Modified

| File | Change |
|------|--------|
| Database migration | Create `notify_donation_requested()` trigger function and trigger on `food_requests` INSERT |
| `src/pages/Dashboard.tsx` | Remove the failing client-side notification insert for `donation_requested` |

