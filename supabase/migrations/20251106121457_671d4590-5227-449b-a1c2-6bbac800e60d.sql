-- Update expiry_date column to support timestamp with time zone
ALTER TABLE public.food_donations 
ALTER COLUMN expiry_date TYPE TIMESTAMP WITH TIME ZONE;