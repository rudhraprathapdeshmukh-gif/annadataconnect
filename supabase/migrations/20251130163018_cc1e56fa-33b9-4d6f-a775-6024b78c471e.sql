-- Update CHECK constraint to only allow 'veg' and 'non-veg'
ALTER TABLE food_donations DROP CONSTRAINT IF EXISTS food_donations_diet_type_check;
ALTER TABLE food_donations ADD CONSTRAINT food_donations_diet_type_check 
  CHECK (diet_type IN ('veg', 'non-veg'));

-- Convert any existing 'vegan' entries to 'veg'
UPDATE food_donations SET diet_type = 'veg' WHERE diet_type = 'vegan';