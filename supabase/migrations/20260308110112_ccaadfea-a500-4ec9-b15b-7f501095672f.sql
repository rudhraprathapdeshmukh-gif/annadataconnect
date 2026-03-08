-- Allow authenticated users to insert user_report_warning notifications
CREATE POLICY "Users can insert report notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND type = 'user_report_warning'
  AND user_id != auth.uid()
);