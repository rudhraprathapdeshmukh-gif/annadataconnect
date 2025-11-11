-- Add SELECT policy so donors can view requester profiles for their own donations
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Donors can view requester profiles for their donations'
  ) THEN
    CREATE POLICY "Donors can view requester profiles for their donations"
    ON public.profiles
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.food_requests fr
        JOIN public.food_donations fd ON fd.id = fr.donation_id
        WHERE fd.donor_id = auth.uid()
          AND fr.requester_id = profiles.id
      )
    );
  END IF;
END
$$;