
CREATE OR REPLACE FUNCTION public.donor_set_request_status(_request_id uuid, _new_status text, _timer_duration integer DEFAULT 30)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _donation_id uuid;
  _current_status text;
  _donor_id uuid;
  _updated_id uuid;
BEGIN
  -- Lock the request row
  SELECT fr.donation_id, fr.status
  INTO _donation_id, _current_status
  FROM food_requests fr
  WHERE fr.id = _request_id
  FOR UPDATE;

  IF _donation_id IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'not_found', 'request_id', _request_id);
  END IF;

  -- Verify caller owns the donation
  SELECT fd.donor_id INTO _donor_id
  FROM food_donations fd
  WHERE fd.id = _donation_id;

  IF _donor_id IS NULL OR _donor_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'reason', 'not_authorized', 'request_id', _request_id);
  END IF;

  -- Check current status
  IF _current_status != 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'reason', 'already_handled',
      'current_status', _current_status,
      'requested_status', _new_status,
      'request_id', _request_id,
      'donation_id', _donation_id
    );
  END IF;

  -- Validate target status
  IF _new_status NOT IN ('approved', 'rejected') THEN
    RETURN json_build_object('success', false, 'reason', 'invalid_status', 'request_id', _request_id);
  END IF;

  IF _new_status = 'approved' THEN
    UPDATE food_requests
    SET status = 'approved',
        accepted_at = now(),
        timer_duration = _timer_duration,
        updated_at = now()
    WHERE id = _request_id
    RETURNING id INTO _updated_id;

    IF _updated_id IS NULL THEN
      RETURN json_build_object('success', false, 'reason', 'update_failed', 'request_id', _request_id);
    END IF;

    UPDATE food_donations
    SET status = 'claimed', updated_at = now()
    WHERE id = _donation_id;

    UPDATE food_requests
    SET status = 'rejected', updated_at = now()
    WHERE donation_id = _donation_id
      AND id != _request_id
      AND status = 'pending';
  ELSE
    -- Reject path: use RETURNING to confirm mutation
    UPDATE food_requests
    SET status = 'rejected',
        updated_at = now()
    WHERE id = _request_id
      AND status = 'pending'
    RETURNING id INTO _updated_id;

    IF _updated_id IS NULL THEN
      RETURN json_build_object('success', false, 'reason', 'update_failed', 'request_id', _request_id);
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'status', _new_status,
    'donation_id', _donation_id,
    'request_id', _request_id
  );
END;
$function$;
