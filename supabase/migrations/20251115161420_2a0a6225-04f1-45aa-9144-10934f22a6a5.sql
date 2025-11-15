-- 1) Update RLS policy to allow receivers to view donor profiles for both approved and completed requests
-- Drop existing policy
DROP POLICY IF EXISTS "Receivers can view donor profiles for approved requests" ON public.profiles;

-- Recreate policy with expanded access
CREATE POLICY "Receivers can view donor profiles for approved or completed requests"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT fd.donor_id
    FROM public.food_donations fd
    JOIN public.food_requests fr ON fr.donation_id = fd.id
    WHERE fr.requester_id = auth.uid()
      AND fr.status IN ('approved', 'completed')
  )
);
