
# Fix: Recreate the Missing `food_donations` Table

The `food_donations` table was accidentally dropped from the database (via a manual DROP TABLE CASCADE). This broke donations, requests, messages, and many other features. Here is the plan to restore it.

## What Happened
The table was manually deleted from the database just minutes ago. Since it was dropped with CASCADE, the foreign key from `food_requests` to `food_donations` was also removed, along with the view `public_food_donations` and associated triggers.

## What Will Be Recreated

### 1. The `food_donations` table with all columns
- id, donor_id, title, description, quantity, quantity_unit, food_type, diet_type, phone_number, pickup_location, latitude, longitude, expiry_date, rating, image_url, otp, status, deleted_at, created_at, updated_at

### 2. RLS Policies
- Donors can view their own donations (SELECT)
- Receivers can view donations related to their requests (SELECT)  
- Donors can create donations (INSERT)
- Donors can update their own donations (UPDATE)
- Donors can soft-delete their own donations (UPDATE on deleted_at)

### 3. Foreign Keys
- Re-add `food_requests.donation_id` -> `food_donations.id` foreign key
- Re-add `messages.donation_id` -> `food_donations.id` foreign key

### 4. Triggers
- `update_food_donations_updated_at` trigger
- `notify_receivers_on_donation_delete` trigger
- `notify_nearby_on_donation_insert` trigger

### 5. View
- Recreate the `public_food_donations` view for receivers to see available donations with masked locations

### 6. Related RLS policies on other tables
- Restore donor-based policies on `food_requests` that reference `food_donations`

## Technical Details

A single database migration will be created containing:

```sql
-- Recreate food_donations table
CREATE TABLE public.food_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  quantity text NOT NULL,
  quantity_unit text NOT NULL DEFAULT 'kg',
  food_type text NOT NULL,
  diet_type text DEFAULT 'veg',
  phone_number text,
  pickup_location text NOT NULL,
  latitude double precision,
  longitude double precision,
  expiry_date timestamptz,
  rating integer,
  image_url text,
  otp text,
  status text DEFAULT 'available',
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS, add policies, triggers, view, and restore foreign keys
```

No code file changes are needed -- the frontend code already references `food_donations` correctly. This is purely a database restoration.
