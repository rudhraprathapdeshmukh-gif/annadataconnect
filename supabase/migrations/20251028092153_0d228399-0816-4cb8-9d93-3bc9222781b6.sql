-- Add rating field to food_donations table
ALTER TABLE public.food_donations
ADD COLUMN rating integer CHECK (rating >= 1 AND rating <= 5);

-- Add unit field for quantity
ALTER TABLE public.food_donations
ADD COLUMN quantity_unit text NOT NULL DEFAULT 'kg' CHECK (quantity_unit IN ('kg', 'grams', 'liters', 'pieces', 'servings', 'plates', 'boxes', 'bags'));