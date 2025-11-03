-- Add latitude and longitude columns to food_donations table
ALTER TABLE public.food_donations
ADD COLUMN latitude double precision,
ADD COLUMN longitude double precision;

COMMENT ON COLUMN public.food_donations.latitude IS 'Latitude coordinate for the donation pickup location';
COMMENT ON COLUMN public.food_donations.longitude IS 'Longitude coordinate for the donation pickup location';

-- Enable realtime for food_donations table
ALTER TABLE public.food_donations REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_donations;