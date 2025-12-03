-- Add notification and language preferences to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_push BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_sms BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';