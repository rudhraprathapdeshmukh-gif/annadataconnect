-- Add storage policies for avatar uploads during signup
-- Allow anyone to upload avatars (needed for signup before authentication)
CREATE POLICY "Anyone can upload avatars during signup"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'food-images' 
  AND (storage.foldername(name))[1] = 'avatars'
);

-- Allow users to view all avatars (they're profile pictures)
CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'food-images' 
  AND (storage.foldername(name))[1] = 'avatars'
);

-- Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'food-images' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'food-images' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[2]
);