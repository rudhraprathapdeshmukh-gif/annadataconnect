-- Update get_user_display_name function to use first_name and last_name
CREATE OR REPLACE FUNCTION public.get_user_display_name(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    CONCAT(first_name, ' ', last_name), 
    email, 
    'Unknown User'
  )
  FROM public.profiles
  WHERE id = user_id
  LIMIT 1;
$function$;