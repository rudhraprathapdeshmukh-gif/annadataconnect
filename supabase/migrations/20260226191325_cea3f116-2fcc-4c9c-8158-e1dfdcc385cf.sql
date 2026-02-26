CREATE POLICY "Users can insert extension request notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND type = 'extension_request'
);