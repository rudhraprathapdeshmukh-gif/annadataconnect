ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_type_check
CHECK (
  type = ANY (
    ARRAY[
      'nearby_donation'::text,
      'request_approved'::text,
      'donation_cancelled'::text,
      'donation_expired'::text,
      'message_received'::text,
      'low_rating_warning'::text,
      'account_suspended'::text,
      'account_blocked'::text,
      'donation_requested'::text,
      'extension_request'::text,
      'extension_granted'::text,
      'extension_rejected'::text,
      'request_rejected'::text,
      'request_auto_rejected'::text
    ]
  )
);