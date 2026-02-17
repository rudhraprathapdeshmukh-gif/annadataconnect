
ALTER TABLE public.messages
  DROP CONSTRAINT messages_donation_id_fkey;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_donation_id_fkey
  FOREIGN KEY (donation_id) REFERENCES public.food_donations(id) ON DELETE CASCADE;

ALTER TABLE public.food_requests
  DROP CONSTRAINT food_requests_donation_id_fkey;

ALTER TABLE public.food_requests
  ADD CONSTRAINT food_requests_donation_id_fkey
  FOREIGN KEY (donation_id) REFERENCES public.food_donations(id) ON DELETE CASCADE;

ALTER TABLE public.food_requests
  DROP CONSTRAINT food_requests_requester_id_fkey;

ALTER TABLE public.food_requests
  ADD CONSTRAINT food_requests_requester_id_fkey
  FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.food_donations
  DROP CONSTRAINT food_donations_donor_id_fkey;

ALTER TABLE public.food_donations
  ADD CONSTRAINT food_donations_donor_id_fkey
  FOREIGN KEY (donor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
