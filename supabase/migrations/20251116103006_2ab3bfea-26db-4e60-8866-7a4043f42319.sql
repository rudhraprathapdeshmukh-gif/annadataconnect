-- Add reliability tracking columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS reliability_score FLOAT DEFAULT 100.0,
ADD COLUMN IF NOT EXISTS total_pickups INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS on_time_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_pickup_time INTEGER;

-- Add timer and tracking columns to food_requests table
ALTER TABLE public.food_requests
ADD COLUMN IF NOT EXISTS estimated_travel_time INTEGER,
ADD COLUMN IF NOT EXISTS timer_duration INTEGER,
ADD COLUMN IF NOT EXISTS extension_requested_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS extension_granted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS arrival_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actual_pickup_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS no_show BOOLEAN DEFAULT false;

-- Create index for faster reliability score queries
CREATE INDEX IF NOT EXISTS idx_profiles_reliability_score ON public.profiles(reliability_score);

-- Create index for faster timer-related queries
CREATE INDEX IF NOT EXISTS idx_food_requests_accepted_at ON public.food_requests(accepted_at);
CREATE INDEX IF NOT EXISTS idx_food_requests_no_show ON public.food_requests(no_show);