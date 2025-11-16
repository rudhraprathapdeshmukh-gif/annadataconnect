-- Create secure soft delete function
CREATE OR REPLACE FUNCTION public.soft_delete_donation(_donation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _donor_id uuid;
BEGIN
  SELECT donor_id INTO _donor_id
  FROM public.food_donations
  WHERE id = _donation_id;

  IF _donor_id IS NULL THEN
    RAISE EXCEPTION 'Donation not found.';
  END IF;

  IF _donor_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only delete your own donation.';
  END IF;

  -- Soft delete the donation
  UPDATE public.food_donations
  SET deleted_at = now()
  WHERE id = _donation_id
    AND deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_donation(uuid) TO anon, authenticated;

-- Ensure the trigger is properly attached
DROP TRIGGER IF EXISTS on_donation_delete ON public.food_donations;

CREATE TRIGGER on_donation_delete
AFTER UPDATE ON public.food_donations
FOR EACH ROW
WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
EXECUTE FUNCTION public.notify_receivers_on_donation_delete();