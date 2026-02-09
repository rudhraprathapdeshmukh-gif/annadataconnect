DROP POLICY IF EXISTS "Donors can update requests for their donations" ON food_requests;
CREATE POLICY "Donors can update requests for their donations" ON food_requests
  FOR UPDATE USING (
    (auth.uid() IN (SELECT food_donations.donor_id FROM food_donations WHERE food_donations.id = food_requests.donation_id))
    AND (NOT has_completed_request(donation_id))
    AND ((NOT is_donation_claimed(donation_id)) OR (status = 'approved') OR (status = 'pending'))
  );