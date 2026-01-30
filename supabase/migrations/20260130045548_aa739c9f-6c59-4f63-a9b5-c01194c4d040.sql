-- Tighten INSERT access on notifications (replace overly-permissive policy)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'System can create notifications for users'
  ) THEN
    EXECUTE 'DROP POLICY "System can create notifications for users" ON public.notifications';
  END IF;
END $$;

CREATE POLICY "Participants can create related notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND related_id IS NOT NULL
  AND (
    -- Receiver -> Donor: new request created (related_id = donation_id)
    (
      type = 'donation_requested'
      AND EXISTS (
        SELECT 1
        FROM public.food_requests fr
        JOIN public.food_donations fd ON fd.id = fr.donation_id
        WHERE fd.id = related_id
          AND fd.donor_id = user_id
          AND fr.requester_id = auth.uid()
      )
    )

    -- Receiver -> Donor: extension requested (related_id = food_requests.id)
    OR (
      type = 'extension_request'
      AND EXISTS (
        SELECT 1
        FROM public.food_requests fr
        JOIN public.food_donations fd ON fd.id = fr.donation_id
        WHERE fr.id = related_id
          AND fd.donor_id = user_id
          AND fr.requester_id = auth.uid()
      )
    )

    -- Donor -> Receiver: extension decision, donation cancelled (related_id = food_requests.id)
    OR (
      type IN ('extension_granted', 'extension_rejected', 'donation_cancelled')
      AND EXISTS (
        SELECT 1
        FROM public.food_requests fr
        JOIN public.food_donations fd ON fd.id = fr.donation_id
        WHERE fr.id = related_id
          AND fr.requester_id = user_id
          AND fd.donor_id = auth.uid()
      )
    )

    -- Donor -> Receiver: request approved (related_id = donation_id)
    OR (
      type = 'request_approved'
      AND EXISTS (
        SELECT 1
        FROM public.food_requests fr
        JOIN public.food_donations fd ON fd.id = fr.donation_id
        WHERE fd.id = related_id
          AND fd.donor_id = auth.uid()
          AND fr.requester_id = user_id
      )
    )

    -- Message sender -> receiver (related_id = messages.id)
    OR (
      type = 'message_received'
      AND EXISTS (
        SELECT 1
        FROM public.messages m
        WHERE m.id = related_id
          AND m.sender_id = auth.uid()
          AND m.receiver_id = user_id
      )
    )
  )
);
