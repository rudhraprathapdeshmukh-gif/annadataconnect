-- Update get_public_donations function to exclude deleted donations
CREATE OR REPLACE FUNCTION public.get_public_donations()
RETURNS TABLE(
  id uuid, 
  title text, 
  description text, 
  quantity text, 
  quantity_unit text, 
  food_type text, 
  expiry_date timestamp with time zone, 
  status text, 
  created_at timestamp with time zone, 
  rating integer, 
  image_url text, 
  approx_latitude numeric, 
  approx_longitude numeric, 
  masked_location text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    -- Approximate location to neighborhood level (0.01 degree ≈ 1km)
    ROUND(fd.latitude::numeric, 2) as approx_latitude,
    ROUND(fd.longitude::numeric, 2) as approx_longitude,
    -- Mask the exact address, show only city/area
    CASE 
      WHEN fd.pickup_location IS NOT NULL THEN
        regexp_replace(fd.pickup_location, '^[^,]+', 'Address hidden until request approved')
      ELSE 'Location not available'
    END as masked_location
  FROM food_donations fd
  WHERE fd.status = 'available'
    AND fd.deleted_at IS NULL;
$$;