-- Fix signup user_type being set to 'both' due to unreliable provider detection
-- 1) Replace handle_new_user to always prefer metadata for user_type and fields
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
  -- Provider lookup (best-effort)
  SELECT provider INTO provider_name
  FROM auth.identities
  WHERE user_id = NEW.id
  LIMIT 1;

  -- Keep email from auth
  user_email := NEW.email;

  -- Block creation of brand-new accounts via Google OAuth
  IF provider_name = 'google' THEN
    RAISE EXCEPTION 'Google sign-in is allowed only for existing accounts. Please sign up first using email/password.';
  END IF;

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

-- 2) Backfill existing profiles where user_type is NULL or 'both' from auth.users metadata when available
UPDATE public.profiles p
SET user_type = au.raw_user_meta_data->>'user_type'
FROM auth.users au
WHERE au.id = p.id
  AND (au.raw_user_meta_data ? 'user_type')
  AND NULLIF(au.raw_user_meta_data->>'user_type','') IS NOT NULL
  AND au.raw_user_meta_data->>'user_type' IN ('donor','receiver','both')
  AND (p.user_type IS NULL OR p.user_type = 'both');