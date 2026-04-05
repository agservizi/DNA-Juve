CREATE TABLE IF NOT EXISTS match_polls (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id          TEXT NOT NULL UNIQUE,
  question          TEXT NOT NULL,
  competition_name  TEXT,
  home_team         TEXT NOT NULL,
  away_team         TEXT NOT NULL,
  kickoff_at        TIMESTAMPTZ NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_poll_options (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id     UUID NOT NULL REFERENCES match_polls(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  position    SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (poll_id, position)
);

CREATE TABLE IF NOT EXISTS match_poll_votes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id     UUID NOT NULL REFERENCES match_polls(id) ON DELETE CASCADE,
  option_id   UUID NOT NULL REFERENCES match_poll_options(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (poll_id, user_id)
);

DROP TRIGGER IF EXISTS match_polls_updated_at ON match_polls;
CREATE TRIGGER match_polls_updated_at
  BEFORE UPDATE ON match_polls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE match_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Match polls: public read" ON match_polls;
DROP POLICY IF EXISTS "Match polls: auth write" ON match_polls;
CREATE POLICY "Match polls: public read"
  ON match_polls FOR SELECT
  USING (true);
CREATE POLICY "Match polls: auth write"
  ON match_polls FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Match poll options: public read" ON match_poll_options;
DROP POLICY IF EXISTS "Match poll options: auth write" ON match_poll_options;
CREATE POLICY "Match poll options: public read"
  ON match_poll_options FOR SELECT
  USING (true);
CREATE POLICY "Match poll options: auth write"
  ON match_poll_options FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Match poll votes: public read" ON match_poll_votes;
DROP POLICY IF EXISTS "Match poll votes: owner insert" ON match_poll_votes;
DROP POLICY IF EXISTS "Match poll votes: owner update" ON match_poll_votes;
CREATE POLICY "Match poll votes: public read"
  ON match_poll_votes FOR SELECT
  USING (true);
CREATE POLICY "Match poll votes: owner insert"
  ON match_poll_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Match poll votes: owner update"
  ON match_poll_votes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS match_polls_kickoff_idx ON match_polls(kickoff_at DESC);
CREATE INDEX IF NOT EXISTS match_polls_active_idx ON match_polls(is_active, expires_at DESC);
CREATE INDEX IF NOT EXISTS match_poll_votes_poll_idx ON match_poll_votes(poll_id, created_at DESC);
