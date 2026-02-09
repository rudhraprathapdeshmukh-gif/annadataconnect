
-- Fix 1: Storage - secure UPDATE/DELETE policies for food images
DROP POLICY IF EXISTS "Users can update their own food images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own food images" ON storage.objects;

CREATE POLICY "Users can update their own food images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'food-images'
  AND auth.uid() = owner
);

CREATE POLICY "Users can delete their own food images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'food-images'
  AND auth.uid() = owner
);

-- Fix 2: Profiles - remove overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view public profile information" ON public.profiles;
