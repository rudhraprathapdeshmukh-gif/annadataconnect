
-- Add unique constraint on phone_number to prevent reuse across accounts
CREATE UNIQUE INDEX idx_profiles_phone_number_unique 
ON public.profiles (phone_number) 
WHERE phone_number IS NOT NULL AND phone_number != '';
