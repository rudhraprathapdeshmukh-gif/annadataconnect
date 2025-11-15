-- Update handle_new_user to allow existing users to login with Google
-- but block new users from signing up with Google
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  provider_name text;
  user_first_name text;
  user_last_name text;
  user_email text;
  user_avatar text;
  user_phone text;
  user_type_value text;
  existing_profile_exists boolean;
BEGIN
  -- Provider lookup
  SELECT provider INTO provider_name
  FROM auth.identities
  WHERE user_id = NEW.id
  LIMIT 1;

  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO existing_profile_exists;

  -- Block creation of brand-new accounts via Google OAuth
  -- Allow existing users to login with Google
  IF provider_name = 'google' AND NOT existing_profile_exists THEN
    RAISE EXCEPTION 'Google sign-in is allowed only for existing accounts. Please sign up first using email/password.';
  END IF;

  -- Keep email from auth
  user_email := NEW.email;

  -- Prefer metadata regardless of provider detection; fall back gracefully
  user_first_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'first_name',''), split_part(NEW.email, '@', 1));
  user_last_name := NULLIF(NEW.raw_user_meta_data->>'last_name','');
  user_avatar := NULLIF(NEW.raw_user_meta_data->>'avatar_url','');
  user_phone := NULLIF(NEW.raw_user_meta_data->>'phone_number','');
  user_type_value := COALESCE(NULLIF(NEW.raw_user_meta_data->>'user_type',''), 'both');

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