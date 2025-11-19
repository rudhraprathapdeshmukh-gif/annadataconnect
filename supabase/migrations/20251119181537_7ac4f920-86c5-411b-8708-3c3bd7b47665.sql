-- Create saved_addresses table
CREATE TABLE public.saved_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address_name TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT NOT NULL,
  complete_address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved addresses
CREATE POLICY "Users can view own saved addresses"
  ON public.saved_addresses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own saved addresses
CREATE POLICY "Users can insert own saved addresses"
  ON public.saved_addresses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved addresses
CREATE POLICY "Users can update own saved addresses"
  ON public.saved_addresses
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own saved addresses
CREATE POLICY "Users can delete own saved addresses"
  ON public.saved_addresses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER handle_updated_at_saved_addresses
  BEFORE UPDATE ON public.saved_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Ensure only one default address per user
CREATE UNIQUE INDEX idx_one_default_per_user 
  ON public.saved_addresses (user_id) 
  WHERE is_default = true;