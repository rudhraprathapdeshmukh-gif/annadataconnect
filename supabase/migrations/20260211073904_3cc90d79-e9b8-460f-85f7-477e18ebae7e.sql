
-- 1. Recreate food_donations table
CREATE TABLE public.food_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  quantity text NOT NULL,
  quantity_unit text NOT NULL DEFAULT 'kg',
  food_type text NOT NULL,
  diet_type text DEFAULT 'veg',
  phone_number text,
  pickup_location text NOT NULL,
  latitude double precision,
  longitude double precision,
  expiry_date timestamptz,
  rating integer,
  image_url text,
  otp text,
  status text DEFAULT 'available',
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.food_donations ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Donors can view their own donations"
  ON public.food_donations FOR SELECT
  USING (auth.uid() = donor_id);

CREATE POLICY "Receivers can view donations related to their requests"
  ON public.food_donations FOR SELECT
  USING (id IN (SELECT donation_id FROM get_receiver_donation_ids(auth.uid())));

CREATE POLICY "Donors can create donations"
  ON public.food_donations FOR INSERT
  WITH CHECK (auth.uid() = donor_id);

CREATE POLICY "Donors can update their own donations"
  ON public.food_donations FOR UPDATE
  USING (auth.uid() = donor_id);

CREATE POLICY "Donors can soft-delete their own donations"
  ON public.food_donations FOR DELETE
  USING (auth.uid() = donor_id);

-- 4. Foreign keys on food_requests and messages
ALTER TABLE public.food_requests
  ADD CONSTRAINT food_requests_donation_id_fkey
  FOREIGN KEY (donation_id) REFERENCES public.food_donations(id);

ALTER TABLE public.messages
  ADD CONSTRAINT messages_donation_id_fkey
  FOREIGN KEY (donation_id) REFERENCES public.food_donations(id);

-- 5. Triggers
CREATE TRIGGER update_food_donations_updated_at
  BEFORE UPDATE ON public.food_donations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER notify_receivers_on_donation_delete
  AFTER UPDATE ON public.food_donations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_receivers_on_donation_delete();

CREATE TRIGGER notify_nearby_on_donation_insert
  AFTER INSERT ON public.food_donations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_nearby_on_donation_insert();

-- 6. Donor-based SELECT policies on food_requests
CREATE POLICY "Donors can view requests for their donations"
  ON public.food_requests FOR SELECT
  USING (donation_id IN (SELECT id FROM public.food_donations WHERE donor_id = auth.uid()));

CREATE POLICY "Donors can update requests for their donations"
  ON public.food_requests FOR UPDATE
  USING (
    donation_id IN (SELECT id FROM public.food_donations WHERE donor_id = auth.uid())
    AND status IN ('pending', 'approved')
    AND ((NOT is_donation_claimed(donation_id)) OR status = 'approved' OR status = 'pending')
  )
  WITH CHECK (
    donation_id IN (SELECT id FROM public.food_donations WHERE donor_id = auth.uid())
    AND status IN ('pending', 'approved', 'rejected')
    AND ((NOT is_donation_claimed(donation_id)) OR status = 'approved' OR status = 'pending' OR status = 'rejected')
  );

-- 7. Receiver SELECT on food_requests
CREATE POLICY "Receivers can view their own requests"
  ON public.food_requests FOR SELECT
  USING (auth.uid() = requester_id);
