-- Create function to notify receivers when donation is deleted
CREATE OR REPLACE FUNCTION public.notify_receivers_on_donation_delete()
RETURNS TRIGGER AS $$
DECLARE
  request_record RECORD;
BEGIN
  -- Only proceed if deleted_at was just set (soft delete)
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    -- Find all approved requests for this donation
    FOR request_record IN 
      SELECT id, requester_id
      FROM public.food_requests
      WHERE donation_id = NEW.id 
      AND status = 'approved'
    LOOP
      -- Create notification for each receiver
      INSERT INTO public.notifications (user_id, type, title, message, related_id)
      VALUES (
        request_record.requester_id,
        'donation_cancelled',
        'Donation Cancelled',
        'We sincerely apologize, but the donor has cancelled the donation "' || NEW.title || '". Your request has been automatically cancelled.',
        request_record.id
      );
      
      -- Update request status to cancelled
      UPDATE public.food_requests
      SET status = 'cancelled', updated_at = now()
      WHERE id = request_record.id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create trigger on food_donations
CREATE TRIGGER on_donation_delete
  AFTER UPDATE ON public.food_donations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_receivers_on_donation_delete();