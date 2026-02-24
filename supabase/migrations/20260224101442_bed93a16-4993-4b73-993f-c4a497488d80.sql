
-- Create a function that returns requester IDs for all active requests on a donor's donations
CREATE OR REPLACE FUNCTION public.get_donor_active_requester_ids(p_donor_id uuid)
RETURNS TABLE(requester_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT fr.requester_id
  FROM food_requests fr
  JOIN food_donations fd ON fr.donation_id = fd.id
  WHERE fd.donor_id = p_donor_id
    AND fr.status IN ('pending', 'approved');
$$;

-- Add RLS policy so donors can view profiles of users with active requests
CREATE POLICY "Donors can view active requester profiles"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT get_donor_active_requester_ids.requester_id
    FROM get_donor_active_requester_ids(auth.uid())
  )
);
