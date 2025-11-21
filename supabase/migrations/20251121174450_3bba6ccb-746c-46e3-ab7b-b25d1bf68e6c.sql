-- Drop the restrictive existing policy
DROP POLICY IF EXISTS "Donors can update requests for their donations" ON food_requests;

-- Recreate the policy with updated logic to allow extension updates
CREATE POLICY "Donors can update requests for their donations"
ON food_requests
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT donor_id FROM food_donations 
    WHERE id = food_requests.donation_id
  )
  AND NOT has_completed_request(donation_id)
  AND (
    -- Allow updates when not claimed (for approve/reject actions)
    NOT is_donation_claimed(donation_id)
    OR
    -- Allow extension-related updates even when claimed
    status = 'approved'
  )
);