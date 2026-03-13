
CREATE OR REPLACE FUNCTION public.get_donation_items_for_available(p_donation_ids uuid[])
RETURNS TABLE(
  id uuid, donation_id uuid, title text, description text,
  quantity text, quantity_unit text, food_type text, diet_type text,
  rating integer, image_url text, expiry_date timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT di.id, di.donation_id, di.title, di.description,
         di.quantity, di.quantity_unit, di.food_type, di.diet_type,
         di.rating, di.image_url, di.expiry_date
  FROM donation_items di
  JOIN food_donations fd ON fd.id = di.donation_id
  WHERE di.donation_id = ANY(p_donation_ids)
    AND fd.status = 'available'
    AND fd.deleted_at IS NULL;
$$;
