
CREATE OR REPLACE FUNCTION public.verify_otp_and_complete(
  _request_id uuid,
  _otp_value text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _donation_id uuid;
  _donor_id uuid;
  _stored_otp text;
BEGIN
  -- Get the donation info for this request
  SELECT fr.donation_id INTO _donation_id
  FROM food_requests fr
  WHERE fr.id = _request_id AND fr.status = 'approved';

  IF _donation_id IS NULL THEN
    RAISE EXCEPTION 'Request not found or not in approved status';
  END IF;

  -- Verify the caller is the donor
  SELECT fd.donor_id, fd.otp INTO _donor_id, _stored_otp
  FROM food_donations fd
  WHERE fd.id = _donation_id;

  IF _donor_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the donor can verify the OTP';
  END IF;

  IF _stored_otp IS NULL OR _stored_otp <> _otp_value THEN
    RAISE EXCEPTION 'Invalid OTP';
  END IF;

  -- Mark request as completed
  UPDATE food_requests
  SET status = 'completed', actual_pickup_at = now(), updated_at = now()
  WHERE id = _request_id;
END;
$$;
