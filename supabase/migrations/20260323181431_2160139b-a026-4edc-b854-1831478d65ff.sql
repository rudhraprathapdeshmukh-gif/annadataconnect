DROP POLICY IF EXISTS "Donors can update requests for their donations" ON public.food_requests;

CREATE POLICY "Donors can update requests for their donations"
ON public.food_requests
FOR UPDATE
TO public
USING (
  donation_id IN (
    SELECT fd.id
    FROM public.food_donations fd
    WHERE fd.donor_id = auth.uid()
  )
  AND COALESCE(status, 'pending') = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])
)
WITH CHECK (
  donation_id IN (
    SELECT fd.id
    FROM public.food_donations fd
    WHERE fd.donor_id = auth.uid()
  )
  AND status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])
);