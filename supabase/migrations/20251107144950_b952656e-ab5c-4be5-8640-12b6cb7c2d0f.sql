-- Add completed status to food_requests and update RLS policies

-- First, let's allow the 'completed' status for food_requests (it's already using text type, so no schema change needed)

-- Update RLS policy to prevent new requests when a donation is claimed or has a completed request
DROP POLICY IF EXISTS "Receivers can create requests" ON food_requests;

CREATE POLICY "Receivers can create requests" 
ON food_requests 
FOR INSERT 
WITH CHECK (
  auth.uid() = requester_id 
  AND NOT EXISTS (
    SELECT 1 FROM food_requests fr 
    WHERE fr.donation_id = donation_id 
    AND fr.status = 'completed'
  )
  AND NOT EXISTS (
    SELECT 1 FROM food_donations fd 
    WHERE fd.id = donation_id 
    AND fd.status = 'claimed'
  )
);

-- Update RLS policy to prevent donors from accepting requests when donation is claimed
DROP POLICY IF EXISTS "Donors can update requests for their donations" ON food_requests;

CREATE POLICY "Donors can update requests for their donations" 
ON food_requests 
FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT donor_id FROM food_donations WHERE id = donation_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM food_requests fr 
    WHERE fr.donation_id = donation_id 
    AND fr.status = 'completed'
    AND fr.id != food_requests.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM food_donations fd 
    WHERE fd.id = donation_id 
    AND fd.status = 'claimed'
  )
);

-- Allow receivers to update their own requests to completed status
CREATE POLICY "Receivers can complete their approved requests" 
ON food_requests 
FOR UPDATE 
USING (
  auth.uid() = requester_id 
  AND status = 'approved'
);