
CREATE OR REPLACE FUNCTION public.auto_reject_stale_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  stale_request RECORD;
BEGIN
  FOR stale_request IN
    SELECT fr.id, fr.requester_id, fd.title
    FROM food_requests fr
    JOIN food_donations fd ON fd.id = fr.donation_id
    WHERE fr.status = 'pending'
      AND fr.created_at < (now() - interval '1 hour')
  LOOP
    UPDATE food_requests
    SET status = 'rejected', updated_at = now()
    WHERE id = stale_request.id;

    INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES (
      stale_request.requester_id,
      'request_auto_rejected',
      'Request Auto-Rejected',
      'Your request for "' || stale_request.title || '" was automatically rejected after 1 hour without a response from the donor.',
      stale_request.id
    );
  END LOOP;
END;
$$;
