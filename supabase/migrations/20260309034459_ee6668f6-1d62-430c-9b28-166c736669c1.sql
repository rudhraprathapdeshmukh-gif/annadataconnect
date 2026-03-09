
-- Drop all RESTRICTIVE SELECT policies on donation_items and recreate as PERMISSIVE

DROP POLICY IF EXISTS "Donors can view their donation items" ON public.donation_items;
DROP POLICY IF EXISTS "Receivers can view donation items for their requests" ON public.donation_items;
DROP POLICY IF EXISTS "Anyone can view items of available donations" ON public.donation_items;
DROP POLICY IF EXISTS "Receivers can view items for claimed donations" ON public.donation_items;

-- Recreate as PERMISSIVE (any one passing = access granted)
CREATE POLICY "Donors can view their donation items"
  ON public.donation_items FOR SELECT
  USING (donation_id IN (SELECT id FROM food_donations WHERE donor_id = auth.uid()));

CREATE POLICY "Anyone can view items of available donations"
  ON public.donation_items FOR SELECT
  USING (donation_id IN (SELECT id FROM food_donations WHERE status = 'available' AND deleted_at IS NULL));

CREATE POLICY "Receivers can view donation items for their requests"
  ON public.donation_items FOR SELECT
  USING (donation_id IN (SELECT donation_id FROM get_receiver_donation_ids(auth.uid())));

CREATE POLICY "Receivers can view items for claimed donations"
  ON public.donation_items FOR SELECT
  USING (donation_id IN (
    SELECT fd.id FROM food_donations fd
    JOIN food_requests fr ON fr.donation_id = fd.id
    WHERE fr.requester_id = auth.uid()
    AND fr.status IN ('pending', 'approved', 'completed')
  ));
