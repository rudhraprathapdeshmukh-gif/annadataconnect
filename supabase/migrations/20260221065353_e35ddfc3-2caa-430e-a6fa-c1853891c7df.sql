
-- Add profile edit tracking columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_edit_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_edit_reset_at timestamp with time zone NOT NULL DEFAULT now();
