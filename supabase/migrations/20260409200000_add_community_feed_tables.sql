-- ============================================================
-- COMMUNITY FEED: diario e pronostici pubblici dei tifosi
-- ============================================================

-- ─── COMMUNITY DIARY ENTRIES ────────────────────────────────
CREATE TABLE IF NOT EXISTS community_diary_entries (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reader_id       TEXT NOT NULL,                          -- reader fingerprint (non auth)
  username        TEXT NOT NULL DEFAULT 'Tifoso',
  match           TEXT NOT NULL,
  competition     TEXT,
  utc_date        TIMESTAMPTZ,
  home_team_name  TEXT,
  away_team_name  TEXT,
  home_team_crest TEXT,
  away_team_crest TEXT,
  final_home_score INT,
  final_away_score INT,
  mood            TEXT CHECK (mood IN ('ecstatic','happy','neutral','sad','angry')),
  rating          SMALLINT CHECK (rating BETWEEN 1 AND 10),
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE community_diary_entries ENABLE ROW LEVEL SECURITY;

-- Chiunque può leggere
CREATE POLICY "community_diary_public_read"
  ON community_diary_entries FOR SELECT
  USING (true);

-- Chiunque può inserire (reader guest tramite fingerprint)
CREATE POLICY "community_diary_public_insert"
  ON community_diary_entries FOR INSERT
  WITH CHECK (true);

-- Indice per feed recente
CREATE INDEX IF NOT EXISTS idx_community_diary_created_at
  ON community_diary_entries (created_at DESC);

-- ─── COMMUNITY PREDICTIONS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS community_predictions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reader_id       TEXT NOT NULL,
  username        TEXT NOT NULL DEFAULT 'Tifoso',
  match           TEXT NOT NULL,
  competition     TEXT,
  utc_date        TIMESTAMPTZ,
  home_team_name  TEXT,
  away_team_name  TEXT,
  home_team_crest TEXT,
  away_team_crest TEXT,
  home_score      SMALLINT NOT NULL DEFAULT 0,
  away_score      SMALLINT NOT NULL DEFAULT 0,
  motm            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE community_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_predictions_public_read"
  ON community_predictions FOR SELECT
  USING (true);

CREATE POLICY "community_predictions_public_insert"
  ON community_predictions FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_community_predictions_created_at
  ON community_predictions (created_at DESC);
