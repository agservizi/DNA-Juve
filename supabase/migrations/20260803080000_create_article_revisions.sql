-- Reconstructed from supabase/schema.sql. The admin editor persists the
-- previous article body here before each update.
CREATE TABLE IF NOT EXISTS public.article_revisions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id  UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  title       TEXT,
  content     TEXT,
  excerpt     TEXT,
  saved_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS article_revisions_article_idx
  ON public.article_revisions(article_id, created_at DESC);

ALTER TABLE public.article_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Article revisions: auth read" ON public.article_revisions;
DROP POLICY IF EXISTS "Article revisions: auth write" ON public.article_revisions;
CREATE POLICY "Article revisions: auth read"
  ON public.article_revisions FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Article revisions: auth write"
  ON public.article_revisions FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
