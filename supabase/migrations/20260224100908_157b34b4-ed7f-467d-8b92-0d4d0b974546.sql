
CREATE OR REPLACE FUNCTION public.get_user_donation_stats(p_user_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'donated_count', (
      SELECT COUNT(*) FROM food_donations
      WHERE donor_id = p_user_id AND status = 'completed' AND deleted_at IS NULL
    ),
    'received_count', (
      SELECT COUNT(*) FROM food_requests
      WHERE requester_id = p_user_id AND status = 'completed'
    )
  );
$$;
