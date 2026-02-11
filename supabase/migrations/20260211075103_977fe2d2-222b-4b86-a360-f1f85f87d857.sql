
CREATE OR REPLACE FUNCTION public.get_nearby_donations(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  quantity text,
  quantity_unit text,
  food_type text,
  diet_type text,
  expiry_date timestamptz,
  status text,
  created_at timestamptz,
  rating integer,
  image_url text,
  approx_latitude numeric,
  approx_longitude numeric,
  masked_location text,
  distance_km double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    fd.id,
    fd.title,
    fd.description,
    fd.quantity,
    fd.quantity_unit,
    fd.food_type,
    fd.diet_type,
    fd.expiry_date,
    fd.status,
    fd.created_at,
    fd.rating,
    fd.image_url,
    ROUND(fd.latitude::numeric, 2) as approx_latitude,
    ROUND(fd.longitude::numeric, 2) as approx_longitude,
    CASE
      WHEN fd.pickup_location IS NOT NULL THEN
        regexp_replace(fd.pickup_location, '^[^,]+', 'Address hidden until approved')
      ELSE 'Location not available'
    END as masked_location,
    (6371 * acos(
      LEAST(GREATEST(
        cos(radians(p_lat)) * cos(radians(fd.latitude)) *
        cos(radians(fd.longitude) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(fd.latitude)),
      -1), 1)
    )) as distance_km
  FROM food_donations fd
  WHERE fd.status = 'available'
    AND fd.deleted_at IS NULL
    AND fd.latitude IS NOT NULL
    AND fd.longitude IS NOT NULL
    AND (6371 * acos(
      LEAST(GREATEST(
        cos(radians(p_lat)) * cos(radians(fd.latitude)) *
        cos(radians(fd.longitude) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(fd.latitude)),
      -1), 1)
    )) <= p_radius_km
  ORDER BY distance_km ASC;
$$;
