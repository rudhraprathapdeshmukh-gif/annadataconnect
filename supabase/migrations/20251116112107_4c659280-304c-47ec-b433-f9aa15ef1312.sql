-- Allow system functions/triggers to insert notifications
-- This policy allows authenticated users to receive notifications from system triggers
CREATE POLICY "System can create notifications for users"
ON public.notifications
FOR INSERT
WITH CHECK (true);