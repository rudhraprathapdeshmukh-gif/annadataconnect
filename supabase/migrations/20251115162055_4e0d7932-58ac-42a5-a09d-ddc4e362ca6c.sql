-- Drop the two problematic policies causing circular dependency
DROP POLICY IF EXISTS "Receivers can view donations for approved or completed requests" ON public.food_donations;
DROP POLICY IF EXISTS "Receivers can view donor profiles for approved or completed requests" ON public.profiles;

-- Create a security definer function to get donor IDs for a receiver
-- This bypasses RLS and breaks the circular dependency
CREATE OR REPLACE FUNCTION public.get_receiver_donor_ids(receiver_id uuid)
RETURNS TABLE(donor_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT fd.donor_id
  FROM food_donations fd
  INNER JOIN food_requests fr ON fr.donation_id = fd.id
  WHERE fr.requester_id = receiver_id
    AND fr.status IN ('approved', 'completed');
$$;

-- Recreate the profiles policy using the security definer function
CREATE POLICY "Receivers can view donor profiles for their requests"
ON public.profiles
FOR SELECT
USING (
  id IN (SELECT donor_id FROM public.get_receiver_donor_ids(auth.uid()))
);