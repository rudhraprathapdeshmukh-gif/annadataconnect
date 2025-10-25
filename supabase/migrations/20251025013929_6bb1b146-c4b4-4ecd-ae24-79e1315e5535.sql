-- Add accepted_at timestamp to track when request is accepted
ALTER TABLE public.food_requests 
ADD COLUMN accepted_at timestamp with time zone;

-- Add index for better performance
CREATE INDEX idx_food_requests_accepted_at ON public.food_requests(accepted_at);