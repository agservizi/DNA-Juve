CREATE TABLE IF NOT EXISTS reader_match_reminders (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id        TEXT NOT NULL,
  minutes_before  INTEGER NOT NULL CHECK (minutes_before >= 0),
  reminder_label  TEXT NOT NULL,
  scheduled_for   TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'queued', 'sent', 'cancelled')),
  sent_at         TIMESTAMPTZ,
  match_payload   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, match_id, minutes_before)
);

CREATE TABLE IF NOT EXISTS reader_push_queue (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type                TEXT NOT NULL DEFAULT 'system',
  title               TEXT NOT NULL,
  body                TEXT,
  url                 TEXT,
  tag                 TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  deliver_not_before  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS reader_match_reminders_updated_at ON reader_match_reminders;
CREATE TRIGGER reader_match_reminders_updated_at
  BEFORE UPDATE ON reader_match_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS reader_push_queue_updated_at ON reader_push_queue;
CREATE TRIGGER reader_push_queue_updated_at
  BEFORE UPDATE ON reader_push_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE reader_match_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_push_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reader match reminders: owner read" ON reader_match_reminders;
DROP POLICY IF EXISTS "Reader match reminders: owner insert" ON reader_match_reminders;
DROP POLICY IF EXISTS "Reader match reminders: owner update" ON reader_match_reminders;
DROP POLICY IF EXISTS "Reader match reminders: owner delete" ON reader_match_reminders;
CREATE POLICY "Reader match reminders: owner read"
  ON reader_match_reminders FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Reader match reminders: owner insert"
  ON reader_match_reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Reader match reminders: owner update"
  ON reader_match_reminders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Reader match reminders: owner delete"
  ON reader_match_reminders FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Reader push queue: owner read" ON reader_push_queue;
CREATE POLICY "Reader push queue: owner read"
  ON reader_push_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS reader_match_reminders_schedule_idx ON reader_match_reminders(status, scheduled_for);
CREATE INDEX IF NOT EXISTS reader_match_reminders_user_idx ON reader_match_reminders(user_id, scheduled_for);
CREATE INDEX IF NOT EXISTS reader_push_queue_delivery_idx ON reader_push_queue(sent_at, deliver_not_before);
CREATE INDEX IF NOT EXISTS reader_push_queue_user_idx ON reader_push_queue(user_id, created_at DESC);