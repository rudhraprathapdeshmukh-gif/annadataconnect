-- Broaden profiles SELECT to allow donors to view requester profiles for their donations
DROP POLICY IF EXISTS "Users can view own profile only" ON profiles;

CREATE POLICY "Users can view own profile only"
ON profiles FOR SELECT
USING (
  auth.uid() = id OR
  EXISTS (
    SELECT 1
    FROM food_requests fr
    JOIN food_donations fd ON fd.id = fr.donation_id
    WHERE fd.donor_id = auth.uid()
      AND fr.requester_id = profiles.id
  )
);
