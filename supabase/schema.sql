-- ============================================================
-- BIANCONERIHUB MAGAZINE — Schema Supabase v2
-- Esegui nel SQL Editor del tuo progetto Supabase
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]'::jsonb;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS co_author_ids UUID[] DEFAULT '{}';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS related_article_ids UUID[] DEFAULT '{}';

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION protect_primary_admin_role()
RETURNS TRIGGER AS $$
DECLARE
  target_email TEXT;
BEGIN
  SELECT email INTO target_email
  FROM auth.users
  WHERE id = NEW.id;

  IF LOWER(COALESCE(target_email, '')) = 'admin@bianconerihub.com'
     AND COALESCE(NEW.role, '') <> 'admin' THEN
    RAISE EXCEPTION 'Primary admin role cannot be downgraded';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS articles_updated_at ON articles;
CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS profiles_protect_primary_admin_role ON profiles;
CREATE TRIGGER profiles_protect_primary_admin_role
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_primary_admin_role();

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
CREATE TABLE IF NOT EXISTS article_view_events (
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (article_id, ip_hash)
);

CREATE INDEX IF NOT EXISTS article_view_events_viewed_at_idx
  ON article_view_events (viewed_at DESC);

DROP FUNCTION IF EXISTS increment_article_views(UUID);

CREATE OR REPLACE FUNCTION increment_article_views(target_article_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  forwarded_for TEXT;
  client_ip TEXT;
  inserted_rows INTEGER;
BEGIN
  forwarded_for := COALESCE(
    current_setting('request.headers', true)::json ->> 'x-forwarded-for',
    current_setting('request.headers', true)::json ->> 'cf-connecting-ip',
    ''
  );

  client_ip := NULLIF(TRIM(SPLIT_PART(forwarded_for, ',', 1)), '');

  IF client_ip IS NULL THEN
    client_ip := COALESCE(inet_client_addr()::TEXT, 'unknown');
  END IF;

  INSERT INTO article_view_events (article_id, ip_hash)
  VALUES (target_article_id, ENCODE(DIGEST(client_ip, 'sha256'), 'hex'))
  ON CONFLICT (article_id, ip_hash) DO NOTHING;

  GET DIAGNOSTICS inserted_rows = ROW_COUNT;

  IF inserted_rows > 0 THEN
    UPDATE articles
    SET views = views + 1
    WHERE id = target_article_id;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
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

-- ─── FORUM / DISCUSSIONS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_categories (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  description   TEXT,
  icon          TEXT DEFAULT 'message-square',
  color         TEXT DEFAULT '#F5A623',
  display_order SMALLINT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO forum_categories (name, slug, description, icon, color, display_order) VALUES
  ('Partite & Risultati', 'partite', 'Discussioni su partite, risultati e prestazioni', 'trophy', '#1a56db', 0),
  ('Calciomercato', 'mercato', 'Rumors, trattative e ufficialita', 'repeat', '#F5A623', 1),
  ('Rosa & Tattiche', 'rosa-tattiche', 'Formazioni, moduli e strategie', 'layout', '#057a55', 2),
  ('Off Topic', 'off-topic', 'Tutto cio che non riguarda la Juve', 'coffee', '#6b7280', 3)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS forum_threads (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id    UUID NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  content        TEXT NOT NULL,
  author_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name    TEXT NOT NULL,
  is_pinned      BOOLEAN DEFAULT FALSE,
  is_locked      BOOLEAN DEFAULT FALSE,
  views          INTEGER DEFAULT 0,
  reply_count    INTEGER DEFAULT 0,
  like_count     INTEGER NOT NULL DEFAULT 0,
  follower_count INTEGER NOT NULL DEFAULT 0,
  last_reply_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
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

CREATE TABLE IF NOT EXISTS forum_thread_likes (
  thread_id   UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS forum_thread_follows (
  thread_id   UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (thread_id, user_id)
);

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

CREATE TABLE IF NOT EXISTS author_follows (
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, author_id)
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

DROP TRIGGER IF EXISTS author_follows_updated_at ON author_follows;
CREATE TRIGGER author_follows_updated_at
  BEFORE UPDATE ON author_follows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS article_polls_updated_at ON article_polls;
CREATE TRIGGER article_polls_updated_at
  BEFORE UPDATE ON article_polls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS match_polls_updated_at ON match_polls;
CREATE TRIGGER match_polls_updated_at
  BEFORE UPDATE ON match_polls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS fan_article_submissions_updated_at ON fan_article_submissions;
CREATE TRIGGER fan_article_submissions_updated_at
  BEFORE UPDATE ON fan_article_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS forum_threads_updated_at ON forum_threads;
CREATE TRIGGER forum_threads_updated_at
  BEFORE UPDATE ON forum_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS forum_replies_updated_at ON forum_replies;
CREATE TRIGGER forum_replies_updated_at
  BEFORE UPDATE ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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

CREATE OR REPLACE FUNCTION increment_thread_views(thread_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE forum_threads
  SET views = views + 1
  WHERE id = thread_id;
END;
$$ LANGUAGE plpgsql;

-- ─── ARTICLE REVISIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS article_revisions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  title       TEXT,
  content     TEXT,
  excerpt     TEXT,
  saved_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS article_revisions_article_idx ON article_revisions(article_id, created_at DESC);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_thread_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_thread_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE fan_article_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reader_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE author_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_poll_votes ENABLE ROW LEVEL SECURITY;

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

-- Forum
DROP POLICY IF EXISTS "forum_categories_read" ON forum_categories;
DROP POLICY IF EXISTS "forum_threads_read" ON forum_threads;
DROP POLICY IF EXISTS "forum_threads_insert" ON forum_threads;
DROP POLICY IF EXISTS "forum_threads_write" ON forum_threads;
DROP POLICY IF EXISTS "forum_threads_insert_auth" ON forum_threads;
DROP POLICY IF EXISTS "forum_threads_update_admin" ON forum_threads;
DROP POLICY IF EXISTS "forum_threads_delete_admin" ON forum_threads;
DROP POLICY IF EXISTS "forum_replies_read" ON forum_replies;
DROP POLICY IF EXISTS "forum_replies_insert" ON forum_replies;
DROP POLICY IF EXISTS "forum_replies_write" ON forum_replies;
DROP POLICY IF EXISTS "forum_replies_insert_auth" ON forum_replies;
DROP POLICY IF EXISTS "forum_replies_update_admin" ON forum_replies;
DROP POLICY IF EXISTS "forum_replies_delete_admin" ON forum_replies;
DROP POLICY IF EXISTS "forum_thread_likes_read" ON forum_thread_likes;
DROP POLICY IF EXISTS "forum_thread_likes_insert" ON forum_thread_likes;
DROP POLICY IF EXISTS "forum_thread_likes_delete" ON forum_thread_likes;
DROP POLICY IF EXISTS "forum_thread_follows_read" ON forum_thread_follows;
DROP POLICY IF EXISTS "forum_thread_follows_insert" ON forum_thread_follows;
DROP POLICY IF EXISTS "forum_thread_follows_delete" ON forum_thread_follows;
CREATE POLICY "forum_categories_read"
  ON forum_categories FOR SELECT
  USING (true);
CREATE POLICY "forum_threads_read"
  ON forum_threads FOR SELECT
  USING (true);
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
CREATE POLICY "forum_replies_read"
  ON forum_replies FOR SELECT
  USING (true);
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
CREATE POLICY "forum_thread_likes_read"
  ON forum_thread_likes FOR SELECT
  USING (true);
CREATE POLICY "forum_thread_likes_insert"
  ON forum_thread_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_thread_likes_delete"
  ON forum_thread_likes FOR DELETE
  USING (auth.uid() = user_id OR is_admin_user(auth.uid()));
CREATE POLICY "forum_thread_follows_read"
  ON forum_thread_follows FOR SELECT
  USING (true);
CREATE POLICY "forum_thread_follows_insert"
  ON forum_thread_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_thread_follows_delete"
  ON forum_thread_follows FOR DELETE
  USING (auth.uid() = user_id OR is_admin_user(auth.uid()));

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

-- Author follows
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

-- Article revisions
DROP POLICY IF EXISTS "Article revisions: auth read" ON article_revisions;
DROP POLICY IF EXISTS "Article revisions: auth write" ON article_revisions;
CREATE POLICY "Article revisions: auth read"
  ON article_revisions FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Article revisions: auth write"
  ON article_revisions FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

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
CREATE INDEX IF NOT EXISTS forum_threads_category_idx ON forum_threads(category_id, created_at DESC);
CREATE INDEX IF NOT EXISTS forum_threads_pinned_idx ON forum_threads(is_pinned, last_reply_at DESC);
CREATE INDEX IF NOT EXISTS forum_threads_last_reply_idx ON forum_threads(last_reply_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS forum_threads_like_idx ON forum_threads(like_count DESC, follower_count DESC);
CREATE INDEX IF NOT EXISTS forum_replies_thread_idx ON forum_replies(thread_id, created_at);
CREATE INDEX IF NOT EXISTS forum_thread_likes_thread_idx ON forum_thread_likes(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS forum_thread_likes_user_idx ON forum_thread_likes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS forum_thread_follows_thread_idx ON forum_thread_follows(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS forum_thread_follows_user_idx ON forum_thread_follows(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fan_article_submissions_status_idx ON fan_article_submissions(status);
CREATE INDEX IF NOT EXISTS fan_article_submissions_submitted_idx ON fan_article_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS profiles_role_idx        ON profiles(role);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_active_idx ON push_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS reader_notifications_user_idx ON reader_notifications(user_id);
CREATE INDEX IF NOT EXISTS reader_notifications_unread_idx ON reader_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS author_follows_author_idx ON author_follows(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS author_follows_user_idx ON author_follows(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS match_polls_kickoff_idx ON match_polls(kickoff_at DESC);
CREATE INDEX IF NOT EXISTS match_polls_active_idx ON match_polls(is_active, expires_at DESC);
CREATE INDEX IF NOT EXISTS match_poll_votes_poll_idx ON match_poll_votes(poll_id, created_at DESC);

-- ─── OPTIONAL: pg_cron per scheduled publish ─────────────────
-- Se il tuo piano Supabase supporta pg_cron:
-- SELECT cron.schedule('publish-scheduled', '* * * * *', 'SELECT publish_scheduled_articles()');
