
-- #4: Secure insert_user_location with search_path and auth check
CREATE OR REPLACE FUNCTION public.insert_user_location(p_user_id uuid, p_lat double precision, p_lng double precision)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow users to update their own location
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only update your own location';
  END IF;
  
  UPDATE public.profiles
  SET latitude = p_lat, longitude = p_lng, updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- #5a: Trigger for extension_granted notifications
CREATE OR REPLACE FUNCTION public.notify_extension_granted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  remaining_extensions integer;
BEGIN
  -- Fire when extension_granted changes from false/null to true
  IF NEW.extension_granted = true AND (OLD.extension_granted IS NULL OR OLD.extension_granted = false) THEN
    remaining_extensions := 3 - COALESCE(NEW.extension_count, 0);
    
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.requester_id,
      'extension_granted',
      'Extension Granted',
      'The donor has granted your time extension request. You now have 10 more minutes. ' ||
        CASE WHEN remaining_extensions > 0 
          THEN remaining_extensions || ' extension(s) remaining.'
          ELSE 'No more extensions available.'
        END,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_extension_granted
  AFTER UPDATE ON public.food_requests
  FOR EACH ROW
  WHEN (NEW.extension_granted = true AND (OLD.extension_granted IS DISTINCT FROM true))
  EXECUTE FUNCTION public.notify_extension_granted();

-- #5b: Trigger for extension_rejected notifications (extension_requested_at cleared without granting)
CREATE OR REPLACE FUNCTION public.notify_extension_rejected()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  remaining_extensions integer;
BEGIN
  -- Fire when extension_requested_at is cleared but extension_granted stays false and count increased
  IF OLD.extension_requested_at IS NOT NULL 
     AND NEW.extension_requested_at IS NULL
     AND (NEW.extension_granted IS NULL OR NEW.extension_granted = false)
     AND COALESCE(NEW.extension_count, 0) > COALESCE(OLD.extension_count, 0) THEN
    
    remaining_extensions := 3 - COALESCE(NEW.extension_count, 0);
    
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.requester_id,
      'extension_rejected',
      'Extension Request Rejected',
      'The donor has declined your time extension request. ' || remaining_extensions || ' extension(s) remaining.',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_extension_rejected
  AFTER UPDATE ON public.food_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_extension_rejected();

-- #5c: Trigger for auto-rejected requests when another is approved
CREATE OR REPLACE FUNCTION public.notify_request_auto_rejected()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  donation_title text;
BEGIN
  -- Fire when status changes from pending to rejected
  IF OLD.status = 'pending' AND NEW.status = 'rejected' THEN
    SELECT title INTO donation_title FROM public.food_donations WHERE id = NEW.donation_id;
    
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.requester_id,
      'request_rejected',
      'Request Not Selected',
      'Your request for "' || COALESCE(donation_title, 'a donation') || '" was not selected. The donor chose another requester.',
      NEW.donation_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_request_auto_rejected
  AFTER UPDATE ON public.food_requests
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'rejected')
  EXECUTE FUNCTION public.notify_request_auto_rejected();

-- #6: Extend auto_reject_stale_requests to handle expired approved requests
CREATE OR REPLACE FUNCTION public.auto_reject_stale_requests()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  stale_request RECORD;
BEGIN
  -- Reject pending requests older than 1 hour
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

  -- Reject approved requests whose timer has expired
  FOR stale_request IN
    SELECT fr.id, fr.requester_id, fd.title, fd.id as donation_id
    FROM food_requests fr
    JOIN food_donations fd ON fd.id = fr.donation_id
    WHERE fr.status = 'approved'
      AND fr.accepted_at IS NOT NULL
      AND fr.accepted_at + (COALESCE(fr.timer_duration, 30) * interval '1 minute') < now()
  LOOP
    UPDATE food_requests
    SET status = 'rejected', updated_at = now()
    WHERE id = stale_request.id;

    -- Reset donation back to available
    UPDATE food_donations
    SET status = 'available', updated_at = now()
    WHERE id = stale_request.donation_id;

    INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES (
      stale_request.requester_id,
      'request_auto_rejected',
      'Pickup Time Expired',
      'Your approved request for "' || stale_request.title || '" was automatically cancelled because the pickup timer expired.',
      stale_request.id
    );
  END LOOP;
END;
$$;
