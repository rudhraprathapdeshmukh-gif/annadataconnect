-- Add phone number to profiles table
ALTER TABLE public.profiles 
ADD COLUMN phone_number text;

-- Add comment
COMMENT ON COLUMN public.profiles.phone_number IS 'Contact phone number with country code';