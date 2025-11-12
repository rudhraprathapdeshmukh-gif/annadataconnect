-- Drop existing problematic policies
DROP POLICY IF EXISTS "View own donations and available donations" ON food_donations;
DROP POLICY IF EXISTS "Users can view own requests" ON food_requests;
DROP POLICY IF EXISTS "Users can view own profile only" ON profiles;
DROP POLICY IF EXISTS "Donors can view requester profiles for their donations" ON profiles;

-- Recreate food_donations SELECT policy without circular reference
CREATE POLICY "View own donations and available donations"
ON food_donations FOR SELECT
USING (
  auth.uid() = donor_id 
  OR status = 'available'
);

-- Recreate food_requests SELECT policy without circular reference
CREATE POLICY "Users can view own requests"
ON food_requests FOR SELECT
USING (
  auth.uid() = requester_id
  OR auth.uid() IN (
    SELECT donor_id FROM food_donations WHERE id = donation_id
  )
);

-- Recreate profiles SELECT policies
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Donors can view requester profiles"
ON profiles FOR SELECT
USING (
  id IN (
    SELECT requester_id FROM food_requests
    WHERE donation_id IN (
      SELECT id FROM food_donations WHERE donor_id = auth.uid()
    )
  )
);