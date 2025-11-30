-- Add diet_type column to food_donations
ALTER TABLE food_donations 
ADD COLUMN diet_type text DEFAULT 'veg' CHECK (diet_type IN ('veg', 'non-veg', 'vegan'));

-- Drop and recreate the get_public_donations function to include diet_type
DROP FUNCTION IF EXISTS public.get_public_donations();

CREATE FUNCTION public.get_public_donations()
 RETURNS TABLE(id uuid, title text, description text, quantity text, quantity_unit text, food_type text, expiry_date timestamp with time zone, status text, created_at timestamp with time zone, rating integer, image_url text, approx_latitude numeric, approx_longitude numeric, masked_location text, diet_type text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    fd.id,
    fd.title,
    fd.description,
    fd.quantity,
    fd.quantity_unit,
    fd.food_type,
    fd.expiry_date,
    fd.status,
    fd.created_at,
    fd.rating,
    fd.image_url,
    ROUND(fd.latitude::numeric, 2) as approx_latitude,
    ROUND(fd.longitude::numeric, 2) as approx_longitude,
    CASE 
      WHEN fd.pickup_location IS NOT NULL THEN
        regexp_replace(fd.pickup_location, '^[^,]+', 'Address hidden until request approved')
      ELSE 'Location not available'
    END as masked_location,
    fd.diet_type
  FROM food_donations fd
  WHERE fd.status = 'available'
    AND fd.deleted_at IS NULL;
$function$;