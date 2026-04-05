CREATE TABLE IF NOT EXISTS author_follows (
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, author_id)
);

ALTER TABLE author_follows ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS author_follows_updated_at ON author_follows;
CREATE TRIGGER author_follows_updated_at
  BEFORE UPDATE ON author_follows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP POLICY IF EXISTS "Author follows: public read" ON author_follows;
DROP POLICY IF EXISTS "Author follows: owner insert" ON author_follows;
DROP POLICY IF EXISTS "Author follows: owner delete" ON author_follows;

CREATE POLICY "Author follows: public read"
  ON author_follows FOR SELECT
  USING (true);

CREATE POLICY "Author follows: owner insert"
  ON author_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Author follows: owner delete"
  ON author_follows FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS author_follows_author_idx
  ON author_follows(author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS author_follows_user_idx
  ON author_follows(user_id, created_at DESC);
