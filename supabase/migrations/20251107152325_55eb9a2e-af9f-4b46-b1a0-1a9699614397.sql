-- Fix the RLS policy for receivers creating requests
-- The bug is in the WHERE clause comparing fr.donation_id = fr.donation_id instead of comparing to the NEW record

DROP POLICY IF EXISTS "Receivers can create requests" ON public.food_requests;

CREATE POLICY "Receivers can create requests" 
ON public.food_requests 
FOR INSERT 
WITH CHECK (
  (auth.uid() = requester_id) 
  AND (NOT (EXISTS ( 
    SELECT 1
    FROM food_requests fr
    WHERE (fr.donation_id = food_requests.donation_id) 
    AND (fr.status = 'completed'::text)
  ))) 
  AND (NOT (EXISTS ( 
    SELECT 1
    FROM food_donations fd
    WHERE (fd.id = food_requests.donation_id) 
    AND (fd.status = 'claimed'::text)
  )))
);