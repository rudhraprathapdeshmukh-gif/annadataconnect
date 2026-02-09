
-- Fix get_receiver_donor_ids to validate caller
CREATE OR REPLACE FUNCTION public.get_receiver_donor_ids(receiver_id uuid)
 RETURNS TABLE(donor_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT DISTINCT fd.donor_id
  FROM food_donations fd
  INNER JOIN food_requests fr ON fr.donation_id = fd.id
  WHERE fr.requester_id = receiver_id
    AND fr.requester_id = auth.uid()
    AND fr.status IN ('approved', 'completed');
$$;

-- Fix get_receiver_donation_ids to validate caller
CREATE OR REPLACE FUNCTION public.get_receiver_donation_ids(receiver_id uuid)
 RETURNS TABLE(donation_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT DISTINCT fr.donation_id
  FROM food_requests fr
  WHERE fr.requester_id = receiver_id
    AND fr.requester_id = auth.uid();
$$;
