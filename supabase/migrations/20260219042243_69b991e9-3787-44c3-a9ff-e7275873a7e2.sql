
CREATE OR REPLACE FUNCTION public.check_signup_availability(p_email text, p_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  email_exists boolean;
  phone_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM profiles WHERE email = p_email) INTO email_exists;
  SELECT EXISTS(SELECT 1 FROM profiles WHERE phone_number = p_phone AND phone_number IS NOT NULL AND phone_number != '') INTO phone_exists;
  RETURN json_build_object('email_taken', email_exists, 'phone_taken', phone_exists);
END;
$$;
