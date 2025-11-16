-- Update notify_request_approval function to use dynamic timer duration
CREATE OR REPLACE FUNCTION public.notify_request_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.requester_id,
      'request_approved',
      'Request Approved! 🎉',
      'Your food request has been approved. You have ' || COALESCE(NEW.timer_duration, 30) || ' minutes to confirm pickup.',
      NEW.donation_id
    );
  END IF;
  RETURN NEW;
END;
$$;