-- Drop the current restrictive policy
DROP POLICY IF EXISTS "View donations with location privacy" ON food_donations;

-- Create new policy that allows viewing for any request (not just approved)
CREATE POLICY "View donations with location privacy"
ON food_donations FOR SELECT
USING (
  auth.uid() = donor_id OR
  auth.uid() IN (
    SELECT requester_id FROM food_requests 
    WHERE donation_id = food_donations.id
  )
);