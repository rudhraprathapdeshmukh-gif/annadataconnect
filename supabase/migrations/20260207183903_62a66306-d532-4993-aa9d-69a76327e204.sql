
-- Fix the trigger function to use hardcoded project URL instead of vault lookup
CREATE OR REPLACE FUNCTION public.notify_nearby_on_donation_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  request_id bigint;
BEGIN
  -- Only fire when donation has valid coordinates
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    -- Call the edge function via pg_net using direct project URL
    SELECT net.http_post(
      url := 'https://ipinrucukkciyqprzkmu.supabase.co/functions/v1/notify-nearby-users',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
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
$function$;
