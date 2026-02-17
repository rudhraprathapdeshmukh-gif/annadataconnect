ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'nearby_donation', 'request_approved', 'donation_cancelled', 
  'donation_expired', 'message_received', 'low_rating_warning', 
  'account_suspended', 'account_blocked',
  'donation_requested', 'extension_request', 
  'extension_granted', 'extension_rejected'
));