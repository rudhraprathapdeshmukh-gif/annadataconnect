-- Allow receivers to view donation rows tied to their own approved or completed requests
CREATE POLICY "Receivers can view donations for approved or completed requests"
ON public.food_donations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.food_requests fr
    WHERE fr.donation_id = food_donations.id
      AND fr.requester_id = auth.uid()
      AND fr.status IN ('approved', 'completed')
  )
);
