
-- Drop existing check constraint on notifications.type if it exists, and recreate with low_rating_warning
DO $$
BEGIN
  -- Find and drop existing check constraint on type column
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name IN (
      SELECT constraint_name FROM information_schema.constraint_column_usage 
      WHERE table_name = 'notifications' AND column_name = 'type' AND table_schema = 'public'
    )
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.notifications DROP CONSTRAINT ' || constraint_name
      FROM information_schema.constraint_column_usage 
      WHERE table_name = 'notifications' AND column_name = 'type' AND table_schema = 'public'
      LIMIT 1
    );
  END IF;
END $$;

-- Add updated check constraint including low_rating_warning
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('nearby_donation', 'request_approved', 'donation_cancelled', 'donation_expired', 'message_received', 'low_rating_warning'));
