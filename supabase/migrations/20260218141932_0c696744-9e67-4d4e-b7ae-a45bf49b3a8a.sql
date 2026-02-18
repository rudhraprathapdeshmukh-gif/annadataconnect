
-- Create a trigger function that updates the donor's reliability_score
-- based on the average receiver_rating they receive on completed requests.
-- Scale: avg rating (1-5) maps to reliability score (0-100) => score = avg * 20

CREATE OR REPLACE FUNCTION public.update_donor_reliability_from_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_donor_id UUID;
  v_avg_rating FLOAT;
BEGIN
  -- Only trigger when receiver_rating is set/updated
  IF NEW.receiver_rating IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the donor_id from the donation
  SELECT fd.donor_id INTO v_donor_id
  FROM public.food_donations fd
  WHERE fd.id = NEW.donation_id;

  IF v_donor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate average receiver_rating across all completed requests for this donor's donations
  SELECT AVG(fr.receiver_rating) INTO v_avg_rating
  FROM public.food_requests fr
  JOIN public.food_donations fd ON fd.id = fr.donation_id
  WHERE fd.donor_id = v_donor_id
    AND fr.receiver_rating IS NOT NULL
    AND fr.status = 'completed';

  -- Update reliability_score: map 1-5 avg rating to 0-100 scale
  IF v_avg_rating IS NOT NULL THEN
    UPDATE public.profiles
    SET reliability_score = LEAST(100, GREATEST(0, v_avg_rating * 20))
    WHERE id = v_donor_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_update_donor_reliability_on_rating ON public.food_requests;

-- Create trigger on food_requests when receiver_rating is updated
CREATE TRIGGER trg_update_donor_reliability_on_rating
AFTER INSERT OR UPDATE OF receiver_rating ON public.food_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_donor_reliability_from_rating();
