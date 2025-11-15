-- Add review text fields to food_requests table
ALTER TABLE public.food_requests
ADD COLUMN IF NOT EXISTS donor_review TEXT,
ADD COLUMN IF NOT EXISTS receiver_review TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN public.food_requests.donor_review IS 'Optional review text from receiver about the donor';
COMMENT ON COLUMN public.food_requests.receiver_review IS 'Optional review text from donor about the receiver';