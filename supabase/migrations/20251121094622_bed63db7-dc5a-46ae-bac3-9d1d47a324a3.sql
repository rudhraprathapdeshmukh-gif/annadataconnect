-- Add 'expired' status to food_donations
ALTER TABLE food_donations
  DROP CONSTRAINT IF EXISTS food_donations_status_check;

ALTER TABLE food_donations
  ADD CONSTRAINT food_donations_status_check
  CHECK (status IN ('available', 'claimed', 'completed', 'expired'));

-- Create function to handle donation status based on request status changes
CREATE OR REPLACE FUNCTION public.handle_request_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When request is approved, mark donation as claimed (temporarily unavailable)
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status = 'pending') THEN
    UPDATE public.food_donations
    SET status = 'claimed', updated_at = now()
    WHERE id = NEW.donation_id;
  END IF;
  
  -- When request is rejected/cancelled after being approved, mark donation as expired
  IF (NEW.status IN ('rejected', 'cancelled')) AND OLD.status = 'approved' THEN
    UPDATE public.food_donations
    SET status = 'expired', updated_at = now()
    WHERE id = NEW.donation_id;
  END IF;
  
  -- When request is completed, mark donation as completed (existing logic handled by other trigger)
  -- We don't need to duplicate it here
  
  RETURN NEW;
END;
$$;

-- Create trigger on food_requests to handle status changes
DROP TRIGGER IF EXISTS on_request_status_change ON public.food_requests;

CREATE TRIGGER on_request_status_change
  AFTER UPDATE OF status ON public.food_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_request_status_change();