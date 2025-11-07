-- Drop the existing policy
DROP POLICY IF EXISTS "Receivers can complete their approved requests" ON public.food_requests;

-- Recreate with proper WITH CHECK clause
CREATE POLICY "Receivers can complete their approved requests"
ON public.food_requests
FOR UPDATE
USING (
  auth.uid() = requester_id 
  AND status = 'approved'
)
WITH CHECK (
  auth.uid() = requester_id 
  AND status IN ('approved', 'completed')
);