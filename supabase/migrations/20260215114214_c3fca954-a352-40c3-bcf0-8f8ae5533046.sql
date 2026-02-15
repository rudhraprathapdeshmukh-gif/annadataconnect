
CREATE OR REPLACE FUNCTION public.get_district_donations(p_district text)
RETURNS TABLE(
  id uuid, title text, description text, quantity text,
  quantity_unit text, food_type text, diet_type text,
  expiry_date timestamp with time zone, status text, created_at timestamp with time zone,
  rating integer, image_url text,
  approx_latitude numeric, approx_longitude numeric,
  masked_location text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    fd.id, fd.title, fd.description, fd.quantity,
    fd.quantity_unit, fd.food_type, fd.diet_type,
    fd.expiry_date, fd.status, fd.created_at,
    fd.rating, fd.image_url,
    ROUND(fd.latitude::numeric, 2),
    ROUND(fd.longitude::numeric, 2),
    CASE WHEN fd.pickup_location IS NOT NULL
      THEN regexp_replace(fd.pickup_location, '^[^,]+', 'Address hidden until approved')
      ELSE 'Location not available'
    END
  FROM food_donations fd
  WHERE fd.status = 'available'
    AND fd.deleted_at IS NULL
    AND fd.pickup_location ILIKE '%' || p_district || '%'
  ORDER BY fd.created_at DESC;
$$;
