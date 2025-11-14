-- Add OTP column to food_donations table for pickup verification
ALTER TABLE food_donations
ADD COLUMN otp text;

-- Add comment to explain the column
COMMENT ON COLUMN food_donations.otp IS 'One-time password generated for pickup verification';
