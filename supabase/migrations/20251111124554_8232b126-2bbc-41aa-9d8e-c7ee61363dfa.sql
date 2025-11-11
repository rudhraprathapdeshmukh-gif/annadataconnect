-- Drop the unique constraint on phone_number to allow duplicate or NULL phone numbers
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_number_key;