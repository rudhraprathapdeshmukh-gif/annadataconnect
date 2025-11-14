-- Add policy to allow receivers to view donor profiles for their approved requests
CREATE POLICY "Receivers can view donor profiles for approved requests"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT fd.donor_id
    FROM food_donations fd
    INNER JOIN food_requests fr ON fr.donation_id = fd.id
    WHERE fr.requester_id = auth.uid()
      AND fr.status = 'approved'
  )
);