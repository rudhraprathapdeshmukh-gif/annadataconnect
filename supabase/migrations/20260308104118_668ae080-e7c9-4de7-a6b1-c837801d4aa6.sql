-- Allow authenticated users to view items for claimed/completed donations they have requests for
CREATE POLICY "Receivers can view items for claimed donations"
ON public.donation_items
FOR SELECT
TO authenticated
USING (
  donation_id IN (
    SELECT fd.id FROM public.food_donations fd
    INNER JOIN public.food_requests fr ON fr.donation_id = fd.id
    WHERE fr.requester_id = auth.uid()
      AND fr.status IN ('pending', 'approved', 'completed')
  )
);