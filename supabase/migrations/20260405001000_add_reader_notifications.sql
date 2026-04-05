CREATE TABLE IF NOT EXISTS reader_notifications (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL DEFAULT 'system',
  title           TEXT NOT NULL,
  body            TEXT,
  url             TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reader_notifications ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS reader_notifications_updated_at ON reader_notifications;
CREATE TRIGGER reader_notifications_updated_at
  BEFORE UPDATE ON reader_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP POLICY IF EXISTS "Reader notifications: owner read" ON reader_notifications;
DROP POLICY IF EXISTS "Reader notifications: owner insert" ON reader_notifications;
DROP POLICY IF EXISTS "Reader notifications: owner update" ON reader_notifications;

CREATE POLICY "Reader notifications: owner read"
  ON reader_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Reader notifications: owner insert"
  ON reader_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Reader notifications: owner update"
  ON reader_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS reader_notifications_user_idx
  ON reader_notifications(user_id);

CREATE INDEX IF NOT EXISTS reader_notifications_unread_idx
  ON reader_notifications(user_id, is_read, created_at DESC);
