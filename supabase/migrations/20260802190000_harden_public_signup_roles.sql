-- Public signups are always readers. Editorial roles can only be assigned by an admin.
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'reader';

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
  ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     AND NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Only administrators can change profile roles';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS profiles_prevent_role_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_role_escalation
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_escalation();
