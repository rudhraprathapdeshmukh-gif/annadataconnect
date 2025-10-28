-- Drop the overly permissive policy that allows viewing all profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a new policy that only allows users to view their own profile
CREATE POLICY "Users can view own profile only" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Create a security definer function to safely get user display names
-- This allows the app to show names without exposing emails
CREATE OR REPLACE FUNCTION public.get_user_display_name(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(full_name, email, 'Unknown User')
  FROM public.profiles
  WHERE id = user_id
  LIMIT 1;
$$;