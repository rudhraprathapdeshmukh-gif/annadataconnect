-- 1) Update notify_receivers_on_donation_delete to cancel ALL non-final requests (pending + approved)
CREATE OR REPLACE FUNCTION public.notify_receivers_on_donation_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  request_record RECORD;
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    FOR request_record IN 
      SELECT id, requester_id
      FROM public.food_requests
      WHERE donation_id = NEW.id 
      AND status IN ('pending', 'approved')
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, related_id)
      VALUES (
        request_record.requester_id,
        'donation_cancelled',
        'Donation Cancelled',
        'We sincerely apologize, but the donor has cancelled the donation "' || NEW.title || '". Your request has been automatically cancelled.',
        request_record.id
      );
      
      UPDATE public.food_requests
      SET status = 'cancelled', updated_at = now()
      WHERE id = request_record.id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2) Harden donor_set_request_status with FOR UPDATE lock and donation status management
CREATE OR REPLACE FUNCTION public.donor_set_request_status(
  _request_id uuid,
  _new_status text,
  _timer_duration integer DEFAULT 30
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _donation_id uuid;
  _current_status text;
  _donor_id uuid;
BEGIN
  SELECT fr.donation_id, fr.status
  INTO _donation_id, _current_status
  FROM food_requests fr
  WHERE fr.id = _request_id
  FOR UPDATE;

  IF _donation_id IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'not_found');
  END IF;

  SELECT fd.donor_id INTO _donor_id
  FROM food_donations fd
  WHERE fd.id = _donation_id;

  IF _donor_id IS NULL OR _donor_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'reason', 'not_authorized');
  END IF;

  IF _current_status != 'pending' THEN
    RETURN json_build_object('success', false, 'reason', 'already_handled', 'current_status', _current_status);
  END IF;

  IF _new_status NOT IN ('approved', 'rejected') THEN
    RETURN json_build_object('success', false, 'reason', 'invalid_status');
  END IF;

  IF _new_status = 'approved' THEN
    UPDATE food_requests
    SET status = 'approved',
        accepted_at = now(),
        timer_duration = _timer_duration,
        updated_at = now()
    WHERE id = _request_id;

    UPDATE food_donations
    SET status = 'claimed', updated_at = now()
    WHERE id = _donation_id;

    UPDATE food_requests
    SET status = 'rejected', updated_at = now()
    WHERE donation_id = _donation_id
      AND id != _request_id
      AND status = 'pending';
  ELSE
    UPDATE food_requests
    SET status = 'rejected',
        updated_at = now()
    WHERE id = _request_id;
  END IF;

  RETURN json_build_object('success', true, 'status', _new_status, 'donation_id', _donation_id);
END;
$$;

-- 3) Create is_donation_requestable helper
CREATE OR REPLACE FUNCTION public.is_donation_requestable(_donation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.food_donations
    WHERE id = _donation_id
      AND status = 'available'
      AND deleted_at IS NULL
  );
$$;

-- 4) Tighten receiver request insert policy
DROP POLICY IF EXISTS "Receivers can create requests" ON public.food_requests;

CREATE POLICY "Receivers can create requests" ON public.food_requests
FOR INSERT
WITH CHECK (
  auth.uid() = requester_id
  AND is_donation_requestable(donation_id)
  AND NOT has_completed_request(donation_id)
  AND NOT is_donation_claimed(donation_id)
  AND NOT has_active_approved_request(donation_id)
);