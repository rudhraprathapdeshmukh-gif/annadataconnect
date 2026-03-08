
CREATE OR REPLACE FUNCTION public.update_donor_reliability_from_rating()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_donor_id UUID;
  v_avg_rating FLOAT;
  v_total_completed INT;
  v_total_requests INT;
  v_on_time_count INT;
  v_no_show_count INT;
  v_total_pickups INT;
  v_rating_score FLOAT;
  v_punctuality_score FLOAT;
  v_completion_score FLOAT;
  v_no_show_penalty FLOAT;
  v_final_score FLOAT;
BEGIN
  IF NEW.receiver_rating IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT fd.donor_id INTO v_donor_id
  FROM public.food_donations fd
  WHERE fd.id = NEW.donation_id;

  IF v_donor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Factor 1: Average donor ratings (weight: 40%)
  SELECT AVG(fr.receiver_rating) INTO v_avg_rating
  FROM public.food_requests fr
  JOIN public.food_donations fd ON fd.id = fr.donation_id
  WHERE fd.donor_id = v_donor_id
    AND fr.receiver_rating IS NOT NULL
    AND fr.status = 'completed';

  v_rating_score := COALESCE(v_avg_rating * 20, 100);

  -- Factor 2: Pickup punctuality (weight: 25%)
  SELECT COALESCE(p.on_time_count, 0), COALESCE(p.total_pickups, 0), COALESCE(p.no_show_count, 0)
  INTO v_on_time_count, v_total_pickups, v_no_show_count
  FROM public.profiles p
  WHERE p.id = v_donor_id;

  IF v_total_pickups > 0 THEN
    v_punctuality_score := (v_on_time_count::float / v_total_pickups::float) * 100;
  ELSE
    v_punctuality_score := 100;
  END IF;

  -- Factor 3: Completion rate (weight: 25%)
  SELECT COUNT(*) FILTER (WHERE fr.status = 'completed'),
         COUNT(*) FILTER (WHERE fr.status IN ('completed', 'rejected', 'cancelled'))
  INTO v_total_completed, v_total_requests
  FROM public.food_requests fr
  JOIN public.food_donations fd ON fd.id = fr.donation_id
  WHERE fd.donor_id = v_donor_id;

  IF v_total_requests > 0 THEN
    v_completion_score := (v_total_completed::float / v_total_requests::float) * 100;
  ELSE
    v_completion_score := 100;
  END IF;

  -- Factor 4: No-show penalty (weight: 10%)
  IF v_total_pickups > 0 THEN
    v_no_show_penalty := ((v_total_pickups - v_no_show_count)::float / v_total_pickups::float) * 100;
  ELSE
    v_no_show_penalty := 100;
  END IF;

  -- Weighted combination: ratings 40% + punctuality 25% + completion 25% + no-show 10%
  v_final_score := (v_rating_score * 0.4) + (v_punctuality_score * 0.25) + (v_completion_score * 0.25) + (v_no_show_penalty * 0.1);

  UPDATE public.profiles
  SET reliability_score = LEAST(100, GREATEST(0, v_final_score))
  WHERE id = v_donor_id;

  RETURN NEW;
END;
$function$;
