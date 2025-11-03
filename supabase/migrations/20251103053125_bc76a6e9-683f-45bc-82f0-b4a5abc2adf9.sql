-- Add phone number column to food_donations table
ALTER TABLE public.food_donations
ADD COLUMN phone_number text;

COMMENT ON COLUMN public.food_donations.phone_number IS 'Contact phone number of the donor for this specific donation';