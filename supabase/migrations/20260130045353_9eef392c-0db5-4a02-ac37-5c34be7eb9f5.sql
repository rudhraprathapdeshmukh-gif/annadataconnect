-- Enable realtime updates for profiles so notification preference changes apply immediately
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;