-- Add extension count tracking to food_requests
ALTER TABLE public.food_requests
ADD COLUMN IF NOT EXISTS extension_count integer DEFAULT 0;

-- Update default timer_duration to 30 minutes (previously 10)
ALTER TABLE public.food_requests
ALTER COLUMN timer_duration SET DEFAULT 30;

COMMENT ON COLUMN public.food_requests.extension_count IS 'Number of times extension has been granted (max 3)';
COMMENT ON COLUMN public.food_requests.timer_duration IS 'Timer duration in minutes (default 30, can be extended by 10 mins up to 3 times)';