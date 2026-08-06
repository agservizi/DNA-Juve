-- BianconeriHub live gallery: media, moderated conversation, realtime and storage.
CREATE TABLE IF NOT EXISTS gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 140),
  caption TEXT NOT NULL DEFAULT '',
  alt_text TEXT NOT NULL DEFAULT '',
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  storage_path TEXT NOT NULL UNIQUE,
  location TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN NOT NULL DEFAULT false,
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  duration_seconds NUMERIC(8,2) CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gallery_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_item_id UUID NOT NULL REFERENCES gallery_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL CHECK (char_length(author_name) BETWEEN 2 AND 60),
  author_email TEXT,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 2 AND 800),
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS gallery_items_updated_at ON gallery_items;
CREATE TRIGGER gallery_items_updated_at BEFORE UPDATE ON gallery_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS gallery_comments_updated_at ON gallery_comments;
CREATE TRIGGER gallery_comments_updated_at BEFORE UPDATE ON gallery_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_gallery_items_public
  ON gallery_items (status, published_at DESC, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_items_featured
  ON gallery_items (featured, captured_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_gallery_comments_item
  ON gallery_comments (gallery_item_id, approved, created_at DESC);

ALTER TABLE gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gallery: public read published" ON gallery_items;
CREATE POLICY "Gallery: public read published" ON gallery_items FOR SELECT
  USING (status = 'published' OR is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Gallery: admin insert" ON gallery_items;
CREATE POLICY "Gallery: admin insert" ON gallery_items FOR INSERT TO authenticated
  WITH CHECK (is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Gallery: admin update" ON gallery_items;
CREATE POLICY "Gallery: admin update" ON gallery_items FOR UPDATE TO authenticated
  USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Gallery: admin delete" ON gallery_items;
CREATE POLICY "Gallery: admin delete" ON gallery_items FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Gallery comments: public read approved" ON gallery_comments;
CREATE POLICY "Gallery comments: public read approved" ON gallery_comments FOR SELECT
  USING (approved = true OR is_admin_user(auth.uid()) OR user_id = auth.uid());
DROP POLICY IF EXISTS "Gallery comments: public submit" ON gallery_comments;
CREATE POLICY "Gallery comments: public submit" ON gallery_comments FOR INSERT TO anon, authenticated
  WITH CHECK (approved = false AND (user_id IS NULL OR user_id = auth.uid()));
DROP POLICY IF EXISTS "Gallery comments: admin moderate" ON gallery_comments;
CREATE POLICY "Gallery comments: admin moderate" ON gallery_comments FOR UPDATE TO authenticated
  USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Gallery comments: admin delete" ON gallery_comments;
CREATE POLICY "Gallery comments: admin delete" ON gallery_comments FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery-media', 'gallery-media', true, 104857600,
  ARRAY['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm','video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Gallery storage: public read" ON storage.objects;
CREATE POLICY "Gallery storage: public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery-media');
DROP POLICY IF EXISTS "Gallery storage: admin insert" ON storage.objects;
CREATE POLICY "Gallery storage: admin insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gallery-media' AND is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Gallery storage: admin update" ON storage.objects;
CREATE POLICY "Gallery storage: admin update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'gallery-media' AND is_admin_user(auth.uid()))
  WITH CHECK (bucket_id = 'gallery-media' AND is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Gallery storage: admin delete" ON storage.objects;
CREATE POLICY "Gallery storage: admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'gallery-media' AND is_admin_user(auth.uid()));

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE gallery_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE gallery_comments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
