-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function to handle both email and OAuth signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  provider_name text;
  user_first_name text;
  user_last_name text;
  user_email text;
  user_avatar text;
  user_phone text;
  user_type_value text;
BEGIN
  -- Get the provider from identities table
  SELECT provider INTO provider_name
  FROM auth.identities
  WHERE user_id = NEW.id
  LIMIT 1;

  -- Extract user information based on provider
  IF provider_name = 'email' THEN
    -- For email signups, use metadata provided during signup
    user_first_name := NEW.raw_user_meta_data->>'first_name';
    user_last_name := NEW.raw_user_meta_data->>'last_name';
    user_phone := NEW.raw_user_meta_data->>'phone_number';
    user_avatar := NEW.raw_user_meta_data->>'avatar_url';
    user_type_value := COALESCE(NEW.raw_user_meta_data->>'user_type', 'both');
  ELSIF provider_name = 'google' THEN
    -- For Google OAuth, extract from OAuth metadata
    user_first_name := COALESCE(
      NEW.raw_user_meta_data->>'given_name',
      NEW.raw_user_meta_data->>'first_name',
      split_part(NEW.raw_user_meta_data->>'full_name', ' ', 1),
      split_part(NEW.email, '@', 1)
    );
    user_last_name := COALESCE(
      NEW.raw_user_meta_data->>'family_name',
      NEW.raw_user_meta_data->>'last_name',
      split_part(NEW.raw_user_meta_data->>'full_name', ' ', 2)
    );
    user_avatar := NEW.raw_user_meta_data->>'avatar_url';
    user_phone := NULL;
    user_type_value := 'both'; -- Default for OAuth users
  ELSE
    -- For other providers, use basic defaults
    user_first_name := split_part(NEW.email, '@', 1);
    user_last_name := NULL;
    user_avatar := NULL;
    user_phone := NULL;
    user_type_value := 'both';
  END IF;

  -- Always use the email from auth
  user_email := NEW.email;

  -- Insert profile for all users
  INSERT INTO public.profiles (id, email, first_name, last_name, phone_number, avatar_url, user_type)
  VALUES (
    NEW.id,
    user_email,
    user_first_name,
    user_last_name,
    user_phone,
    user_avatar,
    user_type_value
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
    user_type = COALESCE(EXCLUDED.user_type, profiles.user_type);

  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();