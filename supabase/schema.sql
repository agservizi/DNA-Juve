-- ============================================================
-- BIANCONERIHUB MAGAZINE — Schema Supabase v2
-- Esegui nel SQL Editor del tuo progetto Supabase
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username   TEXT NOT NULL DEFAULT 'Redazione',
  avatar_url TEXT,
  bio        TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, SPLIT_PART(NEW.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── CATEGORIES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  color      TEXT DEFAULT '#F5A623',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (name, slug, color) VALUES
  ('Calcio',      'calcio',      '#1a56db'),
  ('Mercato',     'mercato',     '#F5A623'),
  ('Formazione',  'formazione',  '#057a55'),
  ('Champions',   'champions',   '#7e3af2'),
  ('Serie A',     'serie-a',     '#e02424'),
  ('Interviste',  'interviste',  '#ff5a1f')
ON CONFLICT (slug) DO NOTHING;

-- ─── ARTICLES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  excerpt      TEXT,
  content      TEXT,
  cover_image  TEXT,
  category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
  author_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status       TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  featured     BOOLEAN DEFAULT FALSE,
  views        INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ   -- Pianificazione pubblicazione automatica
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS articles_updated_at ON articles;
CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-publish scheduled articles (call via cron o pg_cron)
CREATE OR REPLACE FUNCTION publish_scheduled_articles()
RETURNS void AS $$
BEGIN
  UPDATE articles
  SET status = 'published', published_at = NOW(), scheduled_at = NULL
  WHERE status = 'draft'
    AND scheduled_at IS NOT NULL
    AND scheduled_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Increment views
CREATE OR REPLACE FUNCTION increment_article_views(article_id UUID)
RETURNS VOID AS $$
BEGIN UPDATE articles SET views = views + 1 WHERE id = article_id; END;
$$ LANGUAGE plpgsql;

-- ─── TAGS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS article_tags (
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  tag_id     UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Profiles: public read"  ON profiles;
DROP POLICY IF EXISTS "Profiles: owner update" ON profiles;
CREATE POLICY "Profiles: public read"  ON profiles FOR SELECT USING (true);
CREATE POLICY "Profiles: owner update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Categories
DROP POLICY IF EXISTS "Categories: public read"  ON categories;
DROP POLICY IF EXISTS "Categories: auth write"   ON categories;
CREATE POLICY "Categories: public read" ON categories FOR SELECT USING (true);
CREATE POLICY "Categories: auth write"  ON categories FOR ALL USING (auth.role() = 'authenticated');

-- Articles
DROP POLICY IF EXISTS "Articles: public read published" ON articles;
DROP POLICY IF EXISTS "Articles: auth insert" ON articles;
DROP POLICY IF EXISTS "Articles: auth update" ON articles;
DROP POLICY IF EXISTS "Articles: auth delete" ON articles;
CREATE POLICY "Articles: public read published"
  ON articles FOR SELECT USING (status = 'published' OR auth.role() = 'authenticated');
CREATE POLICY "Articles: auth insert" ON articles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Articles: auth update" ON articles FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Articles: auth delete" ON articles FOR DELETE USING (auth.role() = 'authenticated');

-- Tags
DROP POLICY IF EXISTS "Tags: public read"  ON tags;
DROP POLICY IF EXISTS "Tags: auth write"   ON tags;
CREATE POLICY "Tags: public read" ON tags FOR SELECT USING (true);
CREATE POLICY "Tags: auth write"  ON tags FOR ALL USING (auth.role() = 'authenticated');

-- Article tags
DROP POLICY IF EXISTS "Article tags: public read" ON article_tags;
DROP POLICY IF EXISTS "Article tags: auth write"  ON article_tags;
CREATE POLICY "Article tags: public read" ON article_tags FOR SELECT USING (true);
CREATE POLICY "Article tags: auth write"  ON article_tags FOR ALL USING (auth.role() = 'authenticated');

-- ─── STORAGE ─────────────────────────────────────────────────
-- Dalla dashboard Supabase → Storage → New Bucket:
--   Name: article-images | Public: ON
-- Policy per upload autenticati:
--   SELECT: true | INSERT/UPDATE/DELETE: (auth.role() = 'authenticated')

-- ─── INDEXES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS articles_status_idx      ON articles(status);
CREATE INDEX IF NOT EXISTS articles_slug_idx        ON articles(slug);
CREATE INDEX IF NOT EXISTS articles_category_idx    ON articles(category_id);
CREATE INDEX IF NOT EXISTS articles_published_idx   ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS articles_featured_idx    ON articles(featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS articles_scheduled_idx   ON articles(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS article_tags_article_idx ON article_tags(article_id);
CREATE INDEX IF NOT EXISTS article_tags_tag_idx     ON article_tags(tag_id);
CREATE INDEX IF NOT EXISTS tags_slug_idx            ON tags(slug);

-- ─── OPTIONAL: pg_cron per scheduled publish ─────────────────
-- Se il tuo piano Supabase supporta pg_cron:
-- SELECT cron.schedule('publish-scheduled', '* * * * *', 'SELECT publish_scheduled_articles()');
