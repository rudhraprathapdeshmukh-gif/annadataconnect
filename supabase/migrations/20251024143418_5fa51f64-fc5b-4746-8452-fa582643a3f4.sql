-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  user_type text CHECK (user_type IN ('donor', 'receiver', 'both')) DEFAULT 'both',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create food_donations table
CREATE TABLE public.food_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  quantity text NOT NULL,
  food_type text NOT NULL,
  expiry_date date,
  pickup_location text NOT NULL,
  status text CHECK (status IN ('available', 'reserved', 'completed')) DEFAULT 'available',
  image_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on food_donations
ALTER TABLE public.food_donations ENABLE ROW LEVEL SECURITY;

-- Food donations policies
CREATE POLICY "Anyone can view available donations"
  ON public.food_donations FOR SELECT
  USING (true);

CREATE POLICY "Donors can create donations"
  ON public.food_donations FOR INSERT
  WITH CHECK (auth.uid() = donor_id);

CREATE POLICY "Donors can update own donations"
  ON public.food_donations FOR UPDATE
  USING (auth.uid() = donor_id);

CREATE POLICY "Donors can delete own donations"
  ON public.food_donations FOR DELETE
  USING (auth.uid() = donor_id);

-- Create food_requests table
CREATE TABLE public.food_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id uuid REFERENCES public.food_donations(id) ON DELETE CASCADE NOT NULL,
  requester_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'completed')) DEFAULT 'pending',
  message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on food_requests
ALTER TABLE public.food_requests ENABLE ROW LEVEL SECURITY;

-- Food requests policies
CREATE POLICY "Users can view own requests"
  ON public.food_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() IN (
    SELECT donor_id FROM public.food_donations WHERE id = donation_id
  ));

CREATE POLICY "Receivers can create requests"
  ON public.food_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Donors can update requests for their donations"
  ON public.food_requests FOR UPDATE
  USING (auth.uid() IN (
    SELECT donor_id FROM public.food_donations WHERE id = donation_id
  ));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_food_donations_updated_at
  BEFORE UPDATE ON public.food_donations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_food_requests_updated_at
  BEFORE UPDATE ON public.food_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();