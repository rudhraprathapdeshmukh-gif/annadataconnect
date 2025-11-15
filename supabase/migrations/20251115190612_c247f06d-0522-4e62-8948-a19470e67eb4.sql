-- Fix completed donations appearing in deleted section
-- 1) Update on_request_completed() to NOT set deleted_at
CREATE OR REPLACE FUNCTION public.on_request_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Only set status and updated_at, NOT deleted_at
    -- Completed donations should remain visible in history "Completed" section
    UPDATE public.food_donations
      SET status = 'completed', updated_at = now()
      WHERE id = NEW.donation_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_request_completed_trigger'
  ) THEN
    CREATE TRIGGER on_request_completed_trigger
      AFTER UPDATE ON public.food_requests
      FOR EACH ROW
      EXECUTE FUNCTION public.on_request_completed();
  END IF;
END;
$$;

-- 3) Fix existing completed donations that have deleted_at set incorrectly
UPDATE public.food_donations
SET deleted_at = NULL, updated_at = now()
WHERE status = 'completed' 
  AND deleted_at IS NOT NULL
  AND id IN (
    SELECT donation_id 
    FROM public.food_requests 
    WHERE status = 'completed'
  );