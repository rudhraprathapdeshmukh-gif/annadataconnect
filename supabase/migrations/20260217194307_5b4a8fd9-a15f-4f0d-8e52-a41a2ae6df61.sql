
-- Create trigger function for donor low rating moderation
CREATE OR REPLACE FUNCTION public.check_donor_low_ratings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_donor_id uuid;
  v_ratings integer[];
  v_count integer;
  v_existing_warning integer;
  v_suspend_until timestamptz;
  v_is_blocked boolean;
BEGIN
  -- Only fire when receiver_rating changes from NULL to a value
  IF OLD.receiver_rating IS NOT NULL OR NEW.receiver_rating IS NULL THEN
    RETURN NEW;
  END IF;

  -- Look up the donor via food_donations
  SELECT fd.donor_id INTO v_donor_id
  FROM food_donations fd
  WHERE fd.id = NEW.donation_id;

  IF v_donor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get last 7 receiver_ratings for this donor (most recent first)
  SELECT array_agg(fr.receiver_rating ORDER BY fr.updated_at DESC)
  INTO v_ratings
  FROM (
    SELECT fr2.receiver_rating, fr2.updated_at
    FROM food_requests fr2
    INNER JOIN food_donations fd2 ON fd2.id = fr2.donation_id
    WHERE fd2.donor_id = v_donor_id
      AND fr2.receiver_rating IS NOT NULL
    ORDER BY fr2.updated_at DESC
    LIMIT 7
  ) fr;

  IF v_ratings IS NULL THEN
    RETURN NEW;
  END IF;

  v_count := array_length(v_ratings, 1);

  -- Check 7 consecutive low ratings => permanent block
  IF v_count >= 7 THEN
    IF v_ratings[1] <= 2 AND v_ratings[2] <= 2 AND v_ratings[3] <= 2 
       AND v_ratings[4] <= 2 AND v_ratings[5] <= 2 AND v_ratings[6] <= 2 AND v_ratings[7] <= 2 THEN
      
      SELECT permanently_blocked INTO v_is_blocked FROM profiles WHERE id = v_donor_id;
      
      IF NOT COALESCE(v_is_blocked, false) THEN
        UPDATE profiles SET permanently_blocked = true, updated_at = now() WHERE id = v_donor_id;
        
        INSERT INTO notifications (user_id, type, title, message)
        VALUES (v_donor_id, 'account_blocked', 'Account Permanently Blocked',
          'Your account has been permanently blocked due to consistently low ratings across 7 donations. You can no longer create donations. Please contact support if you believe this is an error.');
      END IF;
      
      RETURN NEW;
    END IF;
  END IF;

  -- Check 5 consecutive low ratings => 48h suspension
  IF v_count >= 5 THEN
    IF v_ratings[1] <= 2 AND v_ratings[2] <= 2 AND v_ratings[3] <= 2 
       AND v_ratings[4] <= 2 AND v_ratings[5] <= 2 THEN
      
      SELECT suspended_until INTO v_suspend_until FROM profiles WHERE id = v_donor_id;
      
      IF v_suspend_until IS NULL OR v_suspend_until < now() THEN
        UPDATE profiles SET suspended_until = now() + interval '48 hours', updated_at = now() WHERE id = v_donor_id;
        
        INSERT INTO notifications (user_id, type, title, message)
        VALUES (v_donor_id, 'account_suspended', 'Account Suspended',
          'Your account has been suspended for 48 hours due to consistently low ratings on your donations. Please ensure food quality and hygiene standards.');
      END IF;
      
      RETURN NEW;
    END IF;
  END IF;

  -- Check 3 consecutive low ratings => warning (with 7-day dedup)
  IF v_count >= 3 THEN
    IF v_ratings[1] <= 2 AND v_ratings[2] <= 2 AND v_ratings[3] <= 2 THEN
      
      SELECT COUNT(*) INTO v_existing_warning
      FROM notifications
      WHERE user_id = v_donor_id
        AND type = 'low_rating_warning'
        AND created_at > now() - interval '7 days';
      
      IF v_existing_warning = 0 THEN
        INSERT INTO notifications (user_id, type, title, message)
        VALUES (v_donor_id, 'low_rating_warning', 'Low Rating Warning',
          'Your recent food donations received low ratings in multiple orders. Please ensure food quality and hygiene standards. Continued low ratings may restrict your account.');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS check_donor_low_ratings_trigger ON food_requests;
CREATE TRIGGER check_donor_low_ratings_trigger
  AFTER UPDATE ON food_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_donor_low_ratings();
