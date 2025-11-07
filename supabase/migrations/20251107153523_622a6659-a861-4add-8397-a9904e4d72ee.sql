-- Create security definer function to check for completed requests
CREATE OR REPLACE FUNCTION public.has_completed_request(_donation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.food_requests
    WHERE donation_id = _donation_id
      AND status = 'completed'
  );
$$;

-- Create security definer function to check if donation is claimed
CREATE OR REPLACE FUNCTION public.is_donation_claimed(_donation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.food_donations
    WHERE id = _donation_id
      AND status = 'claimed'
  );
$$;

-- Drop problematic policies
DROP POLICY IF EXISTS "Donors can update requests for their donations" ON public.food_requests;
DROP POLICY IF EXISTS "Receivers can create requests" ON public.food_requests;

-- Recreate policies using security definer functions
CREATE POLICY "Donors can update requests for their donations"
ON public.food_requests
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT donor_id 
    FROM food_donations 
    WHERE id = food_requests.donation_id
  )
  AND NOT public.has_completed_request(food_requests.donation_id)
  AND NOT public.is_donation_claimed(food_requests.donation_id)
);

CREATE POLICY "Receivers can create requests"
ON public.food_requests
FOR INSERT
WITH CHECK (
  auth.uid() = requester_id
  AND NOT public.has_completed_request(donation_id)
  AND NOT public.is_donation_claimed(donation_id)
);