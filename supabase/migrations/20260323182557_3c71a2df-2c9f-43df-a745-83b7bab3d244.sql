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
  WHERE fr.id = _request_id;

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
  ELSE
    UPDATE food_requests
    SET status = 'rejected',
        updated_at = now()
    WHERE id = _request_id;
  END IF;

  IF _new_status = 'approved' THEN
    UPDATE food_requests
    SET status = 'rejected', updated_at = now()
    WHERE donation_id = _donation_id
      AND id != _request_id
      AND status = 'pending';
  END IF;

  RETURN json_build_object('success', true, 'status', _new_status);
END;
$$;