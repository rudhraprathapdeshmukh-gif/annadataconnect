CREATE POLICY "Donors can rate completed requests"
ON public.food_requests FOR UPDATE
TO authenticated
USING (
  status = 'completed'
  AND donation_id IN (
    SELECT id FROM food_donations WHERE donor_id = auth.uid()
  )
)
WITH CHECK (
  status = 'completed'
  AND donation_id IN (
    SELECT id FROM food_donations WHERE donor_id = auth.uid()
  )
);