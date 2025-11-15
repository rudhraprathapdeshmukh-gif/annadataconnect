-- Drop the problematic policy that causes circular dependency
DROP POLICY IF EXISTS "Receivers can view donations for their requests" ON public.food_donations;

-- Create security definer function to get donation IDs for a receiver
-- This bypasses RLS checks and breaks the circular dependency
CREATE OR REPLACE FUNCTION public.get_receiver_donation_ids(receiver_id uuid)
RETURNS TABLE(donation_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT donation_id
  FROM food_requests
  WHERE requester_id = receiver_id;
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Receivers can view donations for their requests"
ON public.food_donations
FOR SELECT
USING (
  id IN (SELECT donation_id FROM public.get_receiver_donation_ids(auth.uid()))
);