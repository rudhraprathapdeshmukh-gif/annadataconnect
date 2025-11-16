-- Extend notifications.type check to include 'donation_cancelled'
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (
    type = ANY (ARRAY[
      'request_approved'::text,
      'message_received'::text,
      'donation_cancelled'::text
    ])
  );

-- Extend food_requests.status check to include 'cancelled'
ALTER TABLE public.food_requests
  DROP CONSTRAINT IF EXISTS food_requests_status_check;

ALTER TABLE public.food_requests
  ADD CONSTRAINT food_requests_status_check
  CHECK (
    status = ANY (ARRAY[
      'pending'::text,
      'approved'::text,
      'rejected'::text,
      'completed'::text,
      'cancelled'::text
    ])
  );