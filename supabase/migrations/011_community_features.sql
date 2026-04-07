-- ============================================================
-- COMMUNITY & CONTENT FEATURES — Migration 011
-- ============================================================

-- ─── STANDALONE POLLS (Sondaggi Live) ───────────────────────
-- These are independent polls not tied to articles or matches
CREATE TABLE IF NOT EXISTS community_polls (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question    TEXT NOT NULL,
  description TEXT,
  category    TEXT DEFAULT 'generale',
  cover_image TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at  TIMESTAMPTZ,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_poll_options (
  id       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id  UUID NOT NULL REFERENCES community_polls(id) ON DELETE CASCADE,
  label    TEXT NOT NULL,
  position SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (poll_id, position)
);

CREATE TABLE IF NOT EXISTS community_poll_votes (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id   UUID NOT NULL REFERENCES community_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES community_poll_options(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (poll_id, user_id)
);

-- ─── PAGELLE (Player Ratings) ──────────────────────────────
CREATE TABLE IF NOT EXISTS pagelle_matches (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id        TEXT UNIQUE,
  home_team       TEXT NOT NULL,
  away_team       TEXT NOT NULL,
  home_score      SMALLINT,
  away_score      SMALLINT,
  competition     TEXT,
  match_date      TIMESTAMPTZ NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  cover_image     TEXT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pagelle_players (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id     UUID NOT NULL REFERENCES pagelle_matches(id) ON DELETE CASCADE,
  player_name  TEXT NOT NULL,
  player_number SMALLINT,
  position     TEXT DEFAULT 'CM',
  is_starter   BOOLEAN DEFAULT TRUE,
  display_order SMALLINT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (match_id, player_name)
);

CREATE TABLE IF NOT EXISTS pagelle_ratings (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id   UUID NOT NULL REFERENCES pagelle_players(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id    TEXT,
  rating      SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 10),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (player_id, user_id)
);

-- ─── FORUM / DISCUSSIONS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_categories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  icon        TEXT DEFAULT 'message-square',
  color       TEXT DEFAULT '#F5A623',
  display_order SMALLINT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO forum_categories (name, slug, description, icon, color, display_order) VALUES
  ('Partite & Risultati', 'partite', 'Discussioni su partite, risultati e prestazioni', 'trophy', '#1a56db', 0),
  ('Calciomercato', 'mercato', 'Rumors, trattative e ufficialità', 'repeat', '#F5A623', 1),
  ('Rosa & Tattiche', 'rosa-tattiche', 'Formazioni, moduli e strategie', 'layout', '#057a55', 2),
  ('Off Topic', 'off-topic', 'Tutto ciò che non riguarda la Juve', 'coffee', '#6b7280', 3)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS forum_threads (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id  UUID NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  author_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name  TEXT NOT NULL,
  is_pinned    BOOLEAN DEFAULT FALSE,
  is_locked    BOOLEAN DEFAULT FALSE,
  views        INTEGER DEFAULT 0,
  reply_count  INTEGER DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_replies (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id   UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  author_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TRANSFER TIMELINE ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS transfer_rumors (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name    TEXT NOT NULL,
  player_image   TEXT,
  from_team      TEXT,
  to_team        TEXT DEFAULT 'Juventus',
  direction      TEXT DEFAULT 'in' CHECK (direction IN ('in', 'out')),
  status         TEXT DEFAULT 'rumor' CHECK (status IN ('rumor', 'trattativa', 'accordo', 'ufficiale', 'sfumato')),
  fee            TEXT,
  reliability    SMALLINT DEFAULT 50 CHECK (reliability >= 0 AND reliability <= 100),
  source         TEXT,
  source_url     TEXT,
  notes          TEXT,
  is_active      BOOLEAN DEFAULT TRUE,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfer_updates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rumor_id    UUID NOT NULL REFERENCES transfer_rumors(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  note        TEXT,
  source      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── VIDEOS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS videos (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title         TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  description   TEXT,
  video_url     TEXT NOT NULL,
  platform      TEXT DEFAULT 'youtube' CHECK (platform IN ('youtube', 'dailymotion', 'vimeo', 'custom')),
  video_id      TEXT,
  thumbnail     TEXT,
  duration      INTEGER DEFAULT 0,
  category      TEXT DEFAULT 'highlights',
  match_date    TIMESTAMPTZ,
  is_published  BOOLEAN DEFAULT FALSE,
  published_at  TIMESTAMPTZ,
  views         INTEGER DEFAULT 0,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TRIGGERS ────────────────────────────────────────────────
DROP TRIGGER IF EXISTS community_polls_updated_at ON community_polls;
CREATE TRIGGER community_polls_updated_at BEFORE UPDATE ON community_polls FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS pagelle_matches_updated_at ON pagelle_matches;
CREATE TRIGGER pagelle_matches_updated_at BEFORE UPDATE ON pagelle_matches FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS forum_threads_updated_at ON forum_threads;
CREATE TRIGGER forum_threads_updated_at BEFORE UPDATE ON forum_threads FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS forum_replies_updated_at ON forum_replies;
CREATE TRIGGER forum_replies_updated_at BEFORE UPDATE ON forum_replies FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS transfer_rumors_updated_at ON transfer_rumors;
CREATE TRIGGER transfer_rumors_updated_at BEFORE UPDATE ON transfer_rumors FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS videos_updated_at ON videos;
CREATE TRIGGER videos_updated_at BEFORE UPDATE ON videos FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── INCREMENT THREAD VIEWS ──────────────────────────────────
CREATE OR REPLACE FUNCTION increment_thread_views(thread_id UUID)
RETURNS VOID AS $$
BEGIN UPDATE forum_threads SET views = views + 1 WHERE id = thread_id; END;
$$ LANGUAGE plpgsql;

-- ─── INCREMENT VIDEO VIEWS ──────────────────────────────────
CREATE OR REPLACE FUNCTION increment_video_views(vid_id UUID)
RETURNS VOID AS $$
BEGIN UPDATE videos SET views = views + 1 WHERE id = vid_id; END;
$$ LANGUAGE plpgsql;

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE community_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagelle_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagelle_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagelle_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_rumors ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Community polls: public read, auth vote, admin manage
CREATE POLICY "community_polls_read" ON community_polls FOR SELECT USING (true);
CREATE POLICY "community_polls_write" ON community_polls FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "community_poll_options_read" ON community_poll_options FOR SELECT USING (true);
CREATE POLICY "community_poll_options_write" ON community_poll_options FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "community_poll_votes_read" ON community_poll_votes FOR SELECT USING (true);
CREATE POLICY "community_poll_votes_insert" ON community_poll_votes FOR INSERT WITH CHECK (true);

-- Pagelle: public read, anyone can rate
CREATE POLICY "pagelle_matches_read" ON pagelle_matches FOR SELECT USING (true);
CREATE POLICY "pagelle_matches_write" ON pagelle_matches FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "pagelle_players_read" ON pagelle_players FOR SELECT USING (true);
CREATE POLICY "pagelle_players_write" ON pagelle_players FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "pagelle_ratings_read" ON pagelle_ratings FOR SELECT USING (true);
CREATE POLICY "pagelle_ratings_insert" ON pagelle_ratings FOR INSERT WITH CHECK (true);

-- Forum: public read, auth write
CREATE POLICY "forum_categories_read" ON forum_categories FOR SELECT USING (true);
CREATE POLICY "forum_threads_read" ON forum_threads FOR SELECT USING (true);
CREATE POLICY "forum_threads_insert" ON forum_threads FOR INSERT WITH CHECK (true);
CREATE POLICY "forum_threads_write" ON forum_threads FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "forum_replies_read" ON forum_replies FOR SELECT USING (true);
CREATE POLICY "forum_replies_insert" ON forum_replies FOR INSERT WITH CHECK (true);
CREATE POLICY "forum_replies_write" ON forum_replies FOR ALL USING (auth.role() = 'authenticated');

-- Transfer rumors: public read, admin write
CREATE POLICY "transfer_rumors_read" ON transfer_rumors FOR SELECT USING (true);
CREATE POLICY "transfer_rumors_write" ON transfer_rumors FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "transfer_updates_read" ON transfer_updates FOR SELECT USING (true);
CREATE POLICY "transfer_updates_write" ON transfer_updates FOR ALL USING (auth.role() = 'authenticated');

-- Videos: public read published, admin write
CREATE POLICY "videos_read" ON videos FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');
CREATE POLICY "videos_write" ON videos FOR ALL USING (auth.role() = 'authenticated');

-- ─── INDEXES ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS community_polls_active_idx ON community_polls(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS community_poll_votes_poll_idx ON community_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS pagelle_matches_date_idx ON pagelle_matches(match_date DESC);
CREATE INDEX IF NOT EXISTS pagelle_ratings_player_idx ON pagelle_ratings(player_id);
CREATE INDEX IF NOT EXISTS forum_threads_category_idx ON forum_threads(category_id, created_at DESC);
CREATE INDEX IF NOT EXISTS forum_threads_pinned_idx ON forum_threads(is_pinned, last_reply_at DESC);
CREATE INDEX IF NOT EXISTS forum_replies_thread_idx ON forum_replies(thread_id, created_at);
CREATE INDEX IF NOT EXISTS transfer_rumors_status_idx ON transfer_rumors(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS transfer_rumors_active_idx ON transfer_rumors(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS videos_published_idx ON videos(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS videos_category_idx ON videos(category);
