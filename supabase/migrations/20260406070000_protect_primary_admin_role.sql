CREATE OR REPLACE FUNCTION protect_primary_admin_role()
RETURNS TRIGGER AS $$
DECLARE
  target_email TEXT;
BEGIN
  SELECT email INTO target_email
  FROM auth.users
  WHERE id = NEW.id;

  IF LOWER(COALESCE(target_email, '')) = 'admin@bianconerihub.com'
     AND COALESCE(NEW.role, '') <> 'admin' THEN
    RAISE EXCEPTION 'Primary admin role cannot be downgraded';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS profiles_protect_primary_admin_role ON profiles;
CREATE TRIGGER profiles_protect_primary_admin_role
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_primary_admin_role();
