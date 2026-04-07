ALTER TABLE forum_threads
  ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS follower_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS forum_thread_likes (
  thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS forum_thread_follows (
  thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE OR REPLACE FUNCTION is_admin_user(target_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = COALESCE(target_user_id, auth.uid())
      AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION sync_forum_thread_reply_meta()
RETURNS TRIGGER AS $$
DECLARE
  target_thread_id UUID := COALESCE(NEW.thread_id, OLD.thread_id);
BEGIN
  UPDATE forum_threads
  SET reply_count = (
        SELECT COUNT(*)::INTEGER
        FROM forum_replies
        WHERE thread_id = target_thread_id
      ),
      last_reply_at = COALESCE(
        (
          SELECT MAX(created_at)
          FROM forum_replies
          WHERE thread_id = target_thread_id
        ),
        created_at
      )
  WHERE id = target_thread_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_forum_thread_like_count()
RETURNS TRIGGER AS $$
DECLARE
  target_thread_id UUID := COALESCE(NEW.thread_id, OLD.thread_id);
BEGIN
  UPDATE forum_threads
  SET like_count = (
    SELECT COUNT(*)::INTEGER
    FROM forum_thread_likes
    WHERE thread_id = target_thread_id
  )
  WHERE id = target_thread_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_forum_thread_follower_count()
RETURNS TRIGGER AS $$
DECLARE
  target_thread_id UUID := COALESCE(NEW.thread_id, OLD.thread_id);
BEGIN
  UPDATE forum_threads
  SET follower_count = (
    SELECT COUNT(*)::INTEGER
    FROM forum_thread_follows
    WHERE thread_id = target_thread_id
  )
  WHERE id = target_thread_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_forum_thread_reply()
RETURNS TRIGGER AS $$
DECLARE
  thread_record RECORD;
  actor_name TEXT := COALESCE(NEW.author_name, 'Un utente');
BEGIN
  SELECT id, title, author_id
  INTO thread_record
  FROM forum_threads
  WHERE id = NEW.thread_id;

  IF thread_record.id IS NULL THEN
    RETURN NEW;
  END IF;

  IF thread_record.author_id IS NOT NULL AND thread_record.author_id IS DISTINCT FROM NEW.author_id THEN
    INSERT INTO reader_notifications (user_id, type, title, body, url, metadata)
    VALUES (
      thread_record.author_id,
      'forum_reply',
      'Nuova risposta al tuo thread',
      actor_name || ' ha risposto a "' || thread_record.title || '".',
      '/community/forum/' || thread_record.id,
      jsonb_build_object(
        'threadId', thread_record.id,
        'replyId', NEW.id,
        'kind', 'thread-author'
      )
    );
  END IF;

  INSERT INTO reader_notifications (user_id, type, title, body, url, metadata)
  SELECT
    follow.user_id,
    'forum_reply',
    'Nuova risposta in un thread che segui',
    actor_name || ' ha scritto una nuova risposta in "' || thread_record.title || '".',
    '/community/forum/' || thread_record.id,
    jsonb_build_object(
      'threadId', thread_record.id,
      'replyId', NEW.id,
      'kind', 'thread-follower'
    )
  FROM forum_thread_follows AS follow
  WHERE follow.thread_id = NEW.thread_id
    AND follow.user_id IS DISTINCT FROM NEW.author_id
    AND follow.user_id IS DISTINCT FROM thread_record.author_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS forum_replies_sync_thread_meta ON forum_replies;
CREATE TRIGGER forum_replies_sync_thread_meta
  AFTER INSERT OR DELETE ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION sync_forum_thread_reply_meta();

DROP TRIGGER IF EXISTS forum_thread_likes_sync_count ON forum_thread_likes;
CREATE TRIGGER forum_thread_likes_sync_count
  AFTER INSERT OR DELETE ON forum_thread_likes
  FOR EACH ROW EXECUTE FUNCTION sync_forum_thread_like_count();

DROP TRIGGER IF EXISTS forum_thread_follows_sync_count ON forum_thread_follows;
CREATE TRIGGER forum_thread_follows_sync_count
  AFTER INSERT OR DELETE ON forum_thread_follows
  FOR EACH ROW EXECUTE FUNCTION sync_forum_thread_follower_count();

DROP TRIGGER IF EXISTS forum_replies_notify_users ON forum_replies;
CREATE TRIGGER forum_replies_notify_users
  AFTER INSERT ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION notify_forum_thread_reply();

UPDATE forum_threads
SET reply_count = (
      SELECT COUNT(*)::INTEGER
      FROM forum_replies
      WHERE thread_id = forum_threads.id
    ),
    like_count = (
      SELECT COUNT(*)::INTEGER
      FROM forum_thread_likes
      WHERE thread_id = forum_threads.id
    ),
    follower_count = (
      SELECT COUNT(*)::INTEGER
      FROM forum_thread_follows
      WHERE thread_id = forum_threads.id
    ),
    last_reply_at = COALESCE(
      (
        SELECT MAX(created_at)
        FROM forum_replies
        WHERE thread_id = forum_threads.id
      ),
      forum_threads.created_at
    );

ALTER TABLE forum_thread_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_thread_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forum_threads_insert" ON forum_threads;
DROP POLICY IF EXISTS "forum_threads_write" ON forum_threads;
DROP POLICY IF EXISTS "forum_replies_insert" ON forum_replies;
DROP POLICY IF EXISTS "forum_replies_write" ON forum_replies;

CREATE POLICY "forum_threads_insert_auth"
  ON forum_threads FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = author_id);

CREATE POLICY "forum_threads_update_admin"
  ON forum_threads FOR UPDATE
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "forum_threads_delete_admin"
  ON forum_threads FOR DELETE
  USING (is_admin_user(auth.uid()));

CREATE POLICY "forum_replies_insert_auth"
  ON forum_replies FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = author_id);

CREATE POLICY "forum_replies_update_admin"
  ON forum_replies FOR UPDATE
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "forum_replies_delete_admin"
  ON forum_replies FOR DELETE
  USING (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "forum_thread_likes_read" ON forum_thread_likes;
DROP POLICY IF EXISTS "forum_thread_likes_insert" ON forum_thread_likes;
DROP POLICY IF EXISTS "forum_thread_likes_delete" ON forum_thread_likes;

CREATE POLICY "forum_thread_likes_read"
  ON forum_thread_likes FOR SELECT
  USING (true);

CREATE POLICY "forum_thread_likes_insert"
  ON forum_thread_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "forum_thread_likes_delete"
  ON forum_thread_likes FOR DELETE
  USING (auth.uid() = user_id OR is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "forum_thread_follows_read" ON forum_thread_follows;
DROP POLICY IF EXISTS "forum_thread_follows_insert" ON forum_thread_follows;
DROP POLICY IF EXISTS "forum_thread_follows_delete" ON forum_thread_follows;

CREATE POLICY "forum_thread_follows_read"
  ON forum_thread_follows FOR SELECT
  USING (true);

CREATE POLICY "forum_thread_follows_insert"
  ON forum_thread_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "forum_thread_follows_delete"
  ON forum_thread_follows FOR DELETE
  USING (auth.uid() = user_id OR is_admin_user(auth.uid()));

CREATE INDEX IF NOT EXISTS forum_thread_likes_thread_idx
  ON forum_thread_likes(thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS forum_thread_likes_user_idx
  ON forum_thread_likes(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS forum_thread_follows_thread_idx
  ON forum_thread_follows(thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS forum_thread_follows_user_idx
  ON forum_thread_follows(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS forum_threads_last_reply_idx
  ON forum_threads(last_reply_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS forum_threads_like_idx
  ON forum_threads(like_count DESC, follower_count DESC);