ALTER TABLE public.profiles ADD COLUMN permanently_blocked boolean DEFAULT false;

ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('nearby_donation', 'request_approved', 'donation_cancelled', 'donation_expired', 'message_received', 'low_rating_warning', 'account_suspended', 'account_blocked'));