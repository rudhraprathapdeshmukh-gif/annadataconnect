-- Create function to check if donation has an active approved request (within 10 min timer)
CREATE OR REPLACE FUNCTION public.has_active_approved_request(_donation_id uuid)
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
      AND status = 'approved'
      AND accepted_at IS NOT NULL
      AND accepted_at > (now() - interval '10 minutes')
  );
$$;

-- Drop and recreate the "Receivers can create requests" policy
DROP POLICY IF EXISTS "Receivers can create requests" ON public.food_requests;

CREATE POLICY "Receivers can create requests"
ON public.food_requests
FOR INSERT
WITH CHECK (
  auth.uid() = requester_id
  AND NOT public.has_completed_request(donation_id)
  AND NOT public.is_donation_claimed(donation_id)
  AND NOT public.has_active_approved_request(donation_id)
);