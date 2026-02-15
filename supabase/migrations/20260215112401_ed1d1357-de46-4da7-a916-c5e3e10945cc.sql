
-- Enable pg_cron and pg_net
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to auto-expire donations
CREATE OR REPLACE FUNCTION public.auto_expire_donations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  expired_donation RECORD;
  request_record RECORD;
BEGIN
  FOR expired_donation IN
    SELECT id, title
    FROM food_donations
    WHERE expiry_date IS NOT NULL
      AND expiry_date < now()
      AND status = 'available'
      AND deleted_at IS NULL
  LOOP
    -- Soft-delete the donation
    UPDATE food_donations
    SET status = 'expired', deleted_at = now(), updated_at = now()
    WHERE id = expired_donation.id;

    -- Cancel pending requests and notify receivers
    FOR request_record IN
      SELECT id, requester_id
      FROM food_requests
      WHERE donation_id = expired_donation.id
        AND status IN ('pending', 'approved')
    LOOP
      UPDATE food_requests
      SET status = 'cancelled', updated_at = now()
      WHERE id = request_record.id;

      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (
        request_record.requester_id,
        'donation_expired',
        'Donation Expired',
        'The donation "' || expired_donation.title || '" has expired and is no longer available.',
        request_record.id
      );
    END LOOP;
  END LOOP;
END;
$$;

-- Schedule the cron job to run every minute
SELECT cron.schedule(
  'auto-expire-donations',
  '* * * * *',
  $$SELECT public.auto_expire_donations();$$
);
