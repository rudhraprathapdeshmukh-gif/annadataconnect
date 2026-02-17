
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
