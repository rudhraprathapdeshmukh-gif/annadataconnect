-- Add 'extension_request' and 'donation_requested' to notifications.type check
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (
    type = ANY (ARRAY[
      'request_approved'::text,
      'message_received'::text,
      'donation_cancelled'::text,
      'extension_request'::text,
      'donation_requested'::text
    ])
  );