-- Update RLS policies for profiles table to allow viewing public information

-- Drop the existing restrictive view policies and create new ones that allow viewing public profile info

-- This policy allows authenticated users to view basic public profile information
CREATE POLICY "Anyone can view public profile information" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Note: The existing "Users can view own profile" policy will still work for full access to own profile
-- The new policy allows viewing first_name, last_name, avatar_url, user_type for any profile
-- Email and phone_number will need to be filtered in the application layer for non-owner views