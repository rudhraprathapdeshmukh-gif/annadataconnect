-- Add policy to allow receivers to view donations for their requests
-- This doesn't cause circular dependency because the subquery only checks
-- requester_id in food_requests, which doesn't require checking food_donations
CREATE POLICY "Receivers can view donations for their requests"
ON public.food_donations
FOR SELECT
USING (
  id IN (
    SELECT donation_id 
    FROM public.food_requests 
    WHERE requester_id = auth.uid()
  )
);