CREATE TABLE IF NOT EXISTS article_polls (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id  UUID NOT NULL UNIQUE REFERENCES articles(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS article_poll_options (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id     UUID NOT NULL REFERENCES article_polls(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  position    SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (poll_id, position)
);

CREATE TABLE IF NOT EXISTS article_poll_votes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id     UUID NOT NULL REFERENCES article_polls(id) ON DELETE CASCADE,
  option_id   UUID NOT NULL REFERENCES article_poll_options(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (poll_id, user_id)
);

DROP TRIGGER IF EXISTS article_polls_updated_at ON article_polls;
CREATE TRIGGER article_polls_updated_at
  BEFORE UPDATE ON article_polls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE article_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Article polls: public read" ON article_polls;
DROP POLICY IF EXISTS "Article polls: auth write" ON article_polls;
CREATE POLICY "Article polls: public read"
  ON article_polls FOR SELECT
  USING (true);
CREATE POLICY "Article polls: auth write"
  ON article_polls FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Article poll options: public read" ON article_poll_options;
DROP POLICY IF EXISTS "Article poll options: auth write" ON article_poll_options;
CREATE POLICY "Article poll options: public read"
  ON article_poll_options FOR SELECT
  USING (true);
CREATE POLICY "Article poll options: auth write"
  ON article_poll_options FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Article poll votes: public read" ON article_poll_votes;
DROP POLICY IF EXISTS "Article poll votes: owner insert" ON article_poll_votes;
DROP POLICY IF EXISTS "Article poll votes: owner update" ON article_poll_votes;
CREATE POLICY "Article poll votes: public read"
  ON article_poll_votes FOR SELECT
  USING (true);
CREATE POLICY "Article poll votes: owner insert"
  ON article_poll_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Article poll votes: owner update"
  ON article_poll_votes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS article_polls_article_idx ON article_polls(article_id);
CREATE INDEX IF NOT EXISTS article_poll_options_poll_idx ON article_poll_options(poll_id, position);
CREATE INDEX IF NOT EXISTS article_poll_votes_poll_idx ON article_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS article_poll_votes_user_idx ON article_poll_votes(user_id);
