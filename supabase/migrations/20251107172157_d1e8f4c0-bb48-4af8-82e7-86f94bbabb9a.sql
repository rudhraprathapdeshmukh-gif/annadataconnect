-- Add deleted_at column to food_donations for soft deletion
ALTER TABLE food_donations 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for better query performance
CREATE INDEX idx_food_donations_deleted_at ON food_donations(deleted_at);

COMMENT ON COLUMN food_donations.deleted_at IS 'Timestamp when the donation was deleted (soft delete)';