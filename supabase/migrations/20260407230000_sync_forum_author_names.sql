CREATE OR REPLACE FUNCTION sync_forum_author_name()
RETURNS TRIGGER AS $$
DECLARE
  profile_username TEXT;
BEGIN
  IF NEW.author_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT username
  INTO profile_username
  FROM profiles
  WHERE id = NEW.author_id;

  IF NULLIF(BTRIM(COALESCE(profile_username, '')), '') IS NOT NULL THEN
    NEW.author_name := profile_username;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS forum_threads_sync_author_name ON forum_threads;
CREATE TRIGGER forum_threads_sync_author_name
  BEFORE INSERT OR UPDATE OF author_id, author_name ON forum_threads
  FOR EACH ROW EXECUTE FUNCTION sync_forum_author_name();

DROP TRIGGER IF EXISTS forum_replies_sync_author_name ON forum_replies;
CREATE TRIGGER forum_replies_sync_author_name
  BEFORE INSERT OR UPDATE OF author_id, author_name ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION sync_forum_author_name();

UPDATE forum_threads AS thread
SET author_name = profile.username
FROM profiles AS profile
WHERE thread.author_id = profile.id
  AND NULLIF(BTRIM(COALESCE(profile.username, '')), '') IS NOT NULL
  AND thread.author_name IS DISTINCT FROM profile.username;

UPDATE forum_replies AS reply
SET author_name = profile.username
FROM profiles AS profile
WHERE reply.author_id = profile.id
  AND NULLIF(BTRIM(COALESCE(profile.username, '')), '') IS NOT NULL
  AND reply.author_name IS DISTINCT FROM profile.username;