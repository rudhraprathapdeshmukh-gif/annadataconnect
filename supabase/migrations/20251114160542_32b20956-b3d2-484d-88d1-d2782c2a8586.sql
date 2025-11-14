BEGIN;

-- Add rating columns
ALTER TABLE public.food_requests
  ADD COLUMN IF NOT EXISTS donor_rating integer CHECK (donor_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS receiver_rating integer CHECK (receiver_rating BETWEEN 1 AND 5);

-- Trigger function to update donation on completion
CREATE OR REPLACE FUNCTION public.on_request_completed()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    UPDATE public.food_donations
      SET status = 'completed', deleted_at = now(), updated_at = now()
      WHERE id = NEW.donation_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger (drop and recreate for idempotency)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_on_request_completed') THEN
    DROP TRIGGER tr_on_request_completed ON public.food_requests;
  END IF;
END$$;

CREATE TRIGGER tr_on_request_completed
AFTER UPDATE ON public.food_requests
FOR EACH ROW
EXECUTE FUNCTION public.on_request_completed();

-- Policies for ratings
DROP POLICY IF EXISTS "Donors can rate completed requests" ON public.food_requests;
CREATE POLICY "Donors can rate completed requests"
ON public.food_requests
FOR UPDATE
USING (
  status = 'completed'
  AND auth.uid() IN (
    SELECT fd.donor_id FROM public.food_donations fd WHERE fd.id = food_requests.donation_id
  )
)
WITH CHECK (
  status = 'completed'
  AND auth.uid() IN (
    SELECT fd.donor_id FROM public.food_donations fd WHERE fd.id = food_requests.donation_id
  )
);

DROP POLICY IF EXISTS "Receivers can rate completed requests" ON public.food_requests;
CREATE POLICY "Receivers can rate completed requests"
ON public.food_requests
FOR UPDATE
USING (
  status = 'completed' AND auth.uid() = requester_id
)
WITH CHECK (
  status = 'completed' AND auth.uid() = requester_id
);

COMMIT;