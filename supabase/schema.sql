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
  author_signature TEXT,
  specialties TEXT[] DEFAULT '{}',
  twitter_url TEXT,
  instagram_url TEXT,
  linkedin_url TEXT,
  role       TEXT NOT NULL DEFAULT 'author' CHECK (role IN ('reader', 'author', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'author';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS author_signature TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  next_username TEXT;
  next_role TEXT;
  has_email_column BOOLEAN;
BEGIN
  next_username := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    SPLIT_PART(COALESCE(NEW.email, ''), '@', 1),
    'Tifoso'
  );
  next_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'author');

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'email'
  ) INTO has_email_column;

  IF has_email_column THEN
    EXECUTE '
      INSERT INTO public.profiles (id, username, role, email)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING
    ' USING NEW.id, next_username, next_role, NEW.email;
  ELSE
    INSERT INTO public.profiles (id, username, role)
    VALUES (NEW.id, next_username, next_role)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
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
  meta_title   TEXT,
  meta_description TEXT,
  canonical_url TEXT,
  og_image     TEXT,
  noindex      BOOLEAN DEFAULT FALSE,
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

ALTER TABLE articles ADD COLUMN IF NOT EXISTS meta_title TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS canonical_url TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS og_image TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS noindex BOOLEAN DEFAULT FALSE;

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

-- ─── COMMENTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id   UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  author_name  TEXT NOT NULL,
  author_email TEXT,
  content      TEXT NOT NULL,
  approved     BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS comments_updated_at ON comments;
CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── FAN ARTICLE SUBMISSIONS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fan_article_submissions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title             TEXT NOT NULL,
  excerpt           TEXT,
  content           TEXT NOT NULL,
  pitch             TEXT,
  category_slug     TEXT REFERENCES categories(slug) ON DELETE SET NULL,
  author_name       TEXT NOT NULL,
  author_email      TEXT NOT NULL,
  status            TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewing', 'approved', 'rejected')),
  review_notes      TEXT,
  linked_article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  submitted_at      TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at       TIMESTAMPTZ
);

-- ─── READER STATES ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reader_states (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bookmarks             JSONB NOT NULL DEFAULT '[]'::jsonb,
  history               JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferences           JSONB NOT NULL DEFAULT '{}'::jsonb,
  gamification          JSONB NOT NULL DEFAULT '{}'::jsonb,
  notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_synced_at        TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint        TEXT NOT NULL UNIQUE,
  subscription    JSONB NOT NULL,
  p256dh          TEXT NOT NULL,
  auth            TEXT NOT NULL,
  user_agent      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_success_at TIMESTAMPTZ,
  last_error      TEXT,
  last_seen_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

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

DROP TRIGGER IF EXISTS reader_states_updated_at ON reader_states;
CREATE TRIGGER reader_states_updated_at
  BEFORE UPDATE ON reader_states
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS reader_notifications_updated_at ON reader_notifications;
CREATE TRIGGER reader_notifications_updated_at
  BEFORE UPDATE ON reader_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS article_polls_updated_at ON article_polls;
CREATE TRIGGER article_polls_updated_at
  BEFORE UPDATE ON article_polls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS fan_article_submissions_updated_at ON fan_article_submissions;
CREATE TRIGGER fan_article_submissions_updated_at
  BEFORE UPDATE ON fan_article_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fan_article_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_poll_votes ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Profiles: public read"  ON profiles;
DROP POLICY IF EXISTS "Profiles: owner update" ON profiles;
CREATE POLICY "Profiles: public read"  ON profiles FOR SELECT USING (true);
CREATE POLICY "Profiles: owner update" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Profiles: owner insert" ON profiles;
CREATE POLICY "Profiles: owner insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

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

-- Comments
DROP POLICY IF EXISTS "Comments: public read approved" ON comments;
DROP POLICY IF EXISTS "Comments: public insert" ON comments;
DROP POLICY IF EXISTS "Comments: auth moderate" ON comments;
CREATE POLICY "Comments: public read approved"
  ON comments FOR SELECT
  USING (approved = true OR auth.role() = 'authenticated');
CREATE POLICY "Comments: public insert"
  ON comments FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Comments: auth moderate"
  ON comments FOR ALL
  USING (auth.role() = 'authenticated');

-- Fan article submissions
DROP POLICY IF EXISTS "Fan submissions: public insert" ON fan_article_submissions;
DROP POLICY IF EXISTS "Fan submissions: auth read" ON fan_article_submissions;
DROP POLICY IF EXISTS "Fan submissions: auth update" ON fan_article_submissions;
DROP POLICY IF EXISTS "Fan submissions: auth delete" ON fan_article_submissions;
CREATE POLICY "Fan submissions: public insert"
  ON fan_article_submissions FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Fan submissions: auth read"
  ON fan_article_submissions FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Fan submissions: auth update"
  ON fan_article_submissions FOR UPDATE
  USING (auth.role() = 'authenticated');
CREATE POLICY "Fan submissions: auth delete"
  ON fan_article_submissions FOR DELETE
  USING (auth.role() = 'authenticated');

-- Reader states
DROP POLICY IF EXISTS "Reader states: owner read" ON reader_states;
DROP POLICY IF EXISTS "Reader states: owner write" ON reader_states;
CREATE POLICY "Reader states: owner read"
  ON reader_states FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Reader states: owner write"
  ON reader_states FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Push subscriptions
DROP POLICY IF EXISTS "Push subscriptions: owner read" ON push_subscriptions;
DROP POLICY IF EXISTS "Push subscriptions: owner insert" ON push_subscriptions;
DROP POLICY IF EXISTS "Push subscriptions: owner update" ON push_subscriptions;
DROP POLICY IF EXISTS "Push subscriptions: owner delete" ON push_subscriptions;
CREATE POLICY "Push subscriptions: owner read"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Push subscriptions: owner insert"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Push subscriptions: owner update"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Push subscriptions: owner delete"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Reader notifications
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

-- Article polls
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

-- ─── STORAGE ─────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'article-images',
  'article-images',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Storage: public read article-images" ON storage.objects;
DROP POLICY IF EXISTS "Storage: auth upload article-images" ON storage.objects;
DROP POLICY IF EXISTS "Storage: auth update article-images" ON storage.objects;
DROP POLICY IF EXISTS "Storage: auth delete article-images" ON storage.objects;

CREATE POLICY "Storage: public read article-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'article-images');

CREATE POLICY "Storage: auth upload article-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'article-images');

CREATE POLICY "Storage: auth update article-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'article-images')
  WITH CHECK (bucket_id = 'article-images');

CREATE POLICY "Storage: auth delete article-images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'article-images');

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
CREATE INDEX IF NOT EXISTS comments_article_idx     ON comments(article_id, approved, created_at);
CREATE INDEX IF NOT EXISTS fan_article_submissions_status_idx ON fan_article_submissions(status);
CREATE INDEX IF NOT EXISTS fan_article_submissions_submitted_idx ON fan_article_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS profiles_role_idx        ON profiles(role);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_active_idx ON push_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS reader_notifications_user_idx ON reader_notifications(user_id);
CREATE INDEX IF NOT EXISTS reader_notifications_unread_idx ON reader_notifications(user_id, is_read, created_at DESC);

-- ─── OPTIONAL: pg_cron per scheduled publish ─────────────────
-- Se il tuo piano Supabase supporta pg_cron:
-- SELECT cron.schedule('publish-scheduled', '* * * * *', 'SELECT publish_scheduled_articles()');
