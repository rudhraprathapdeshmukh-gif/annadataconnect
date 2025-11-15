-- Create trigger to enforce Google signup restriction via handle_new_user
DO $$
BEGIN
  -- Drop if exists to avoid duplicates
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'on_auth_user_created'
      AND n.nspname = 'auth'
  ) THEN
    DROP TRIGGER on_auth_user_created ON auth.users;
  END IF;
END $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();