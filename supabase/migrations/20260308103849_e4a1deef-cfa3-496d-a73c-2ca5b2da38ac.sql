-- Allow any authenticated user to view donation_items for available donations
CREATE POLICY "Anyone can view items of available donations"
ON public.donation_items
FOR SELECT
TO authenticated
USING (
  donation_id IN (
    SELECT id FROM public.food_donations
    WHERE status = 'available' AND deleted_at IS NULL
  )
);