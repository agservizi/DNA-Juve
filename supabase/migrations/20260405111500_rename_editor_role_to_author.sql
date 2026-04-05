ALTER TABLE public.profiles
  ALTER COLUMN role DROP DEFAULT;

UPDATE public.profiles
SET role = 'author'
WHERE role = 'editor';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('reader', 'author', 'admin'));

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'author';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_username TEXT;
  next_role TEXT;
  has_email_column BOOLEAN;
BEGIN
  next_username := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    SPLIT_PART(COALESCE(NEW.email, ''), '@', 1),
    'Tifoso'
  );
  next_role := CASE
    WHEN COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'author') = 'editor' THEN 'author'
    ELSE COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'author')
  END;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'email'
  ) INTO has_email_column;

  IF has_email_column THEN
    EXECUTE '
      INSERT INTO public.profiles (id, username, role, email)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING
    ' USING NEW.id, next_username, next_role, NEW.email;
  ELSE
    INSERT INTO public.profiles (id, username, role)
    VALUES (NEW.id, next_username, next_role)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
