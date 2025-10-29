-- Create storage bucket for food donation images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'food-images',
  'food-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Create RLS policies for food-images bucket
CREATE POLICY "Anyone can view food images"
ON storage.objects FOR SELECT
USING (bucket_id = 'food-images');

CREATE POLICY "Authenticated users can upload food images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'food-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their own food images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'food-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own food images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'food-images' 
  AND auth.uid() IS NOT NULL
);