-- Fix signup: profiles.email may be missing; trigger must not abort auth.users insert.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  next_username TEXT;
  trusted_role TEXT;
BEGIN
  next_username := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'utente'
  );
  trusted_role := CASE
    WHEN NEW.raw_app_meta_data->>'role' IN ('author', 'admin')
      THEN NEW.raw_app_meta_data->>'role'
    ELSE 'reader'
  END;

  INSERT INTO public.profiles (id, username, role, email)
  VALUES (NEW.id, next_username, trusted_role, NEW.email)
  ON CONFLICT (id) DO UPDATE
    SET username = COALESCE(NULLIF(EXCLUDED.username, ''), public.profiles.username),
        email = COALESCE(EXCLUDED.email, public.profiles.email);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
