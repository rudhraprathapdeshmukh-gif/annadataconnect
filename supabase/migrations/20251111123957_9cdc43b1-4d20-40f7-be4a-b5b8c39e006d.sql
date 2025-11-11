-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "View donations with location privacy" ON food_donations;

-- Create new policy that allows viewing available donations
CREATE POLICY "View own donations and available donations"
ON food_donations
FOR SELECT
TO authenticated
USING (
  -- Donors can see their own donations (all statuses)
  auth.uid() = donor_id 
  OR 
  -- Anyone can see available donations (for receivers to browse)
  status = 'available'
  OR
  -- Users can see donations they have requested
  (auth.uid() IN (
    SELECT requester_id 
    FROM food_requests 
    WHERE donation_id = food_donations.id
  ))
);