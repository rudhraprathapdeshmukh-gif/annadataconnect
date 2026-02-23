
-- Function to get receiver IDs for a donor's completed donations
CREATE OR REPLACE FUNCTION public.get_donor_receiver_ids(donor_id uuid)
RETURNS TABLE(receiver_id uuid) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT fr.requester_id AS receiver_id
  FROM food_requests fr
  JOIN food_donations fd ON fr.donation_id = fd.id
  WHERE fd.donor_id = get_donor_receiver_ids.donor_id
    AND fr.status = 'completed';
$$;

-- Allow donors to view profiles of receivers who completed their donations
CREATE POLICY "Donors can view receiver profiles for their donations"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT get_donor_receiver_ids.receiver_id
    FROM get_donor_receiver_ids(auth.uid())
  )
);
