-- Enforce: Block new Google signups and preserve correct user_type from email signups
-- 1) Replace the handle_new_user trigger function to prevent Google-only signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

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
  -- Determine provider for the new auth user
  SELECT provider INTO provider_name
  FROM auth.identities
  WHERE user_id = NEW.id
  LIMIT 1;

  -- Always use the email from auth
  user_email := NEW.email;

  -- Block creation of brand-new accounts via Google OAuth
  IF provider_name = 'google' THEN
    RAISE EXCEPTION 'Google sign-in is allowed only for existing accounts. Please sign up first using email/password.';
  END IF;

  -- For email signups, use provided metadata
  IF provider_name = 'email' THEN
    user_first_name := NEW.raw_user_meta_data->>'first_name';
    user_last_name := NEW.raw_user_meta_data->>'last_name';
    user_phone := NEW.raw_user_meta_data->>'phone_number';
    user_avatar := NEW.raw_user_meta_data->>'avatar_url';
    user_type_value := COALESCE(NEW.raw_user_meta_data->>'user_type', 'both');
  ELSE
    -- Other providers (default safe values)
    user_first_name := split_part(NEW.email, '@', 1);
    user_last_name := NULL;
    user_avatar := NULL;
    user_phone := NULL;
    user_type_value := 'both';
  END IF;

  -- Upsert profile
  INSERT INTO public.profiles (id, email, first_name, last_name, phone_number, avatar_url, user_type)
  VALUES (NEW.id, user_email, user_first_name, user_last_name, user_phone, user_avatar, user_type_value)
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

-- 2) Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();