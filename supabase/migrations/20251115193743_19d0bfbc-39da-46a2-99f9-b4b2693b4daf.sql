-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('request_approved', 'message_received')),
  title text NOT NULL,
  message text NOT NULL,
  related_id uuid,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index for efficient queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- RLS policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to notify when request is approved
CREATE OR REPLACE FUNCTION public.notify_request_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (
      NEW.requester_id,
      'request_approved',
      'Request Approved! 🎉',
      'Your food request has been approved. You have 10 minutes to confirm pickup.',
      NEW.donation_id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for request approval
CREATE TRIGGER on_request_approved
  AFTER UPDATE ON public.food_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_request_approval();

-- Function to notify on new messages
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name text;
BEGIN
  SELECT COALESCE(first_name || ' ' || last_name, 'Someone')
  INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, type, title, message, related_id)
  VALUES (
    NEW.receiver_id,
    'message_received',
    'New Message from ' || sender_name,
    LEFT(NEW.message, 50) || CASE WHEN LENGTH(NEW.message) > 50 THEN '...' ELSE '' END,
    NEW.id
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for new messages
CREATE TRIGGER on_message_inserted
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();