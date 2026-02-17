
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
