-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create updated function that only creates profiles for email signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  provider_name text;
BEGIN
  -- Get the provider from identities table
  SELECT provider INTO provider_name
  FROM auth.identities
  WHERE user_id = NEW.id
  LIMIT 1;

  -- Only create profile for email signups, not OAuth
  IF provider_name = 'email' THEN
    INSERT INTO public.profiles (id, email, first_name, last_name, phone_number, avatar_url, user_type)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'phone_number',
      NEW.raw_user_meta_data->>'avatar_url',
      COALESCE(NEW.raw_user_meta_data->>'user_type', 'both')
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();