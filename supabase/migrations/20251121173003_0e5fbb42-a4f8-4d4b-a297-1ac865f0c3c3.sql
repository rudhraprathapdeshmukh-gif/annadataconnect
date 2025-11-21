-- Drop duplicate trigger
DROP TRIGGER IF EXISTS tr_on_request_completed ON public.food_requests;

-- Update function with better error handling
CREATE OR REPLACE FUNCTION public.on_request_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  update_count INTEGER;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Update the donation status
    UPDATE public.food_donations
      SET status = 'completed', updated_at = now()
      WHERE id = NEW.donation_id;
    
    -- Check if update succeeded
    GET DIAGNOSTICS update_count = ROW_COUNT;
    
    IF update_count = 0 THEN
      RAISE WARNING 'Failed to update food_donation % to completed status', NEW.donation_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;