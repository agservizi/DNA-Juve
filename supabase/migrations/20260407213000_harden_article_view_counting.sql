CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
  touched_rows INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM articles
    WHERE id = target_article_id
      AND status = 'published'
  ) THEN
    RETURN FALSE;
  END IF;

  forwarded_for := COALESCE(
    current_setting('request.headers', true)::json ->> 'x-forwarded-for',
    current_setting('request.headers', true)::json ->> 'cf-connecting-ip',
    ''
  );

  client_ip := NULLIF(TRIM(SPLIT_PART(forwarded_for, ',', 1)), '');

  IF client_ip IS NULL THEN
    client_ip := COALESCE(inet_client_addr()::TEXT, 'unknown');
  END IF;

  INSERT INTO article_view_events (article_id, ip_hash, viewed_at)
  VALUES (target_article_id, ENCODE(extensions.DIGEST(client_ip, 'sha256'), 'hex'), NOW())
  ON CONFLICT (article_id, ip_hash) DO UPDATE
  SET viewed_at = EXCLUDED.viewed_at
  WHERE article_view_events.viewed_at <= NOW() - INTERVAL '6 hours';

  GET DIAGNOSTICS touched_rows = ROW_COUNT;

  IF touched_rows > 0 THEN
    UPDATE articles
    SET views = COALESCE(views, 0) + 1
    WHERE id = target_article_id;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

REVOKE ALL ON FUNCTION increment_article_views(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_article_views(UUID) TO anon, authenticated, service_role;