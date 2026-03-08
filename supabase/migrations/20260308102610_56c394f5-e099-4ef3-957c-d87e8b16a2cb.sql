
CREATE TABLE public.donation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid NOT NULL REFERENCES public.food_donations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  quantity text NOT NULL,
  quantity_unit text NOT NULL DEFAULT 'kg',
  food_type text NOT NULL,
  diet_type text DEFAULT 'veg',
  rating integer,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.donation_items ENABLE ROW LEVEL SECURITY;

-- Donors can view items for their donations
CREATE POLICY "Donors can view their donation items"
ON public.donation_items FOR SELECT
TO authenticated
USING (donation_id IN (SELECT id FROM public.food_donations WHERE donor_id = auth.uid()));

-- Donors can insert items for their donations
CREATE POLICY "Donors can insert donation items"
ON public.donation_items FOR INSERT
TO authenticated
WITH CHECK (donation_id IN (SELECT id FROM public.food_donations WHERE donor_id = auth.uid()));

-- Donors can update items for their donations
CREATE POLICY "Donors can update their donation items"
ON public.donation_items FOR UPDATE
TO authenticated
USING (donation_id IN (SELECT id FROM public.food_donations WHERE donor_id = auth.uid()));

-- Donors can delete items for their donations
CREATE POLICY "Donors can delete their donation items"
ON public.donation_items FOR DELETE
TO authenticated
USING (donation_id IN (SELECT id FROM public.food_donations WHERE donor_id = auth.uid()));

-- Receivers can view items for donations they've requested
CREATE POLICY "Receivers can view donation items for their requests"
ON public.donation_items FOR SELECT
TO authenticated
USING (donation_id IN (
  SELECT donation_id FROM get_receiver_donation_ids(auth.uid())
));
