
-- Step 1: Add latitude and longitude columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision;

-- Step 2: Enable pg_net extension for HTTP calls from SQL
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Step 3: Create trigger function that calls the edge function on new donation insert
CREATE OR REPLACE FUNCTION public.notify_nearby_on_donation_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  request_id bigint;
BEGIN
  -- Only fire when donation has valid coordinates
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    -- Get the Supabase URL and service role key from vault or hardcode project URL
    SELECT decrypted_secret INTO supabase_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
    SELECT decrypted_secret INTO service_role_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

    -- Call the edge function via pg_net
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/notify-nearby-users',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
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

-- Step 4: Create the trigger on food_donations table
DROP TRIGGER IF EXISTS trigger_notify_nearby_on_donation_insert ON public.food_donations;
CREATE TRIGGER trigger_notify_nearby_on_donation_insert
  AFTER INSERT ON public.food_donations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_nearby_on_donation_insert();
