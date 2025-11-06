-- Create messages table for chat between donors and receivers
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  donation_id UUID NOT NULL REFERENCES public.food_donations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for messages
-- Users can view messages where they are sender or receiver
CREATE POLICY "Users can view their own messages" 
ON public.messages 
FOR SELECT 
USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);

-- Users can send messages
CREATE POLICY "Users can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- Users can update read status on messages sent to them
CREATE POLICY "Users can mark messages as read" 
ON public.messages 
FOR UPDATE 
USING (auth.uid() = receiver_id);

-- Create index for faster queries
CREATE INDEX idx_messages_donation_id ON public.messages(donation_id);
CREATE INDEX idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;