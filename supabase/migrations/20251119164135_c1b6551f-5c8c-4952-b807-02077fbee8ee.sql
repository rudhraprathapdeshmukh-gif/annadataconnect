-- Add message type and location fields to messages table
ALTER TABLE public.messages 
ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text';

-- Add check constraint for message type
ALTER TABLE public.messages
ADD CONSTRAINT messages_type_check CHECK (message_type IN ('text', 'location'));

-- Add location coordinates
ALTER TABLE public.messages 
ADD COLUMN latitude NUMERIC(10, 8),
ADD COLUMN longitude NUMERIC(11, 8),
ADD COLUMN location_name TEXT;

-- Add constraint: if message_type is 'location', coordinates must be present
ALTER TABLE public.messages
ADD CONSTRAINT location_message_coordinates
CHECK (
  (message_type = 'text') OR 
  (message_type = 'location' AND latitude IS NOT NULL AND longitude IS NOT NULL)
);