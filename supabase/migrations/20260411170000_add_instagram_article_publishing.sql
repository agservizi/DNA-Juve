ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS instagram_image TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS instagram_caption_override TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS instagram_publish_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS instagram_post_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS instagram_post_error TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS instagram_posted_at TIMESTAMPTZ;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS instagram_media_id TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS instagram_post_id TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS instagram_post_permalink TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'articles_instagram_post_status_check'
  ) THEN
    ALTER TABLE public.articles
      ADD CONSTRAINT articles_instagram_post_status_check
      CHECK (instagram_post_status IN ('pending', 'processing', 'published', 'failed', 'disabled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS articles_instagram_queue_idx
  ON public.articles (instagram_post_status, published_at DESC)
  WHERE status = 'published' AND instagram_publish_enabled = TRUE;

CREATE OR REPLACE FUNCTION public.configure_instagram_publisher_cron(job_schedule TEXT DEFAULT '*/5 * * * *')
RETURNS void AS $$
DECLARE
  target_job_name CONSTANT TEXT := 'publish-instagram-articles';
  project_url_secret TEXT;
  anon_key_secret TEXT;
  cron_secret_value TEXT;
  existing_job_id BIGINT;
BEGIN
  SELECT decrypted_secret
  INTO project_url_secret
  FROM vault.decrypted_secrets
  WHERE name = 'project_url'
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT decrypted_secret
  INTO anon_key_secret
  FROM vault.decrypted_secrets
  WHERE name = 'anon_key'
  ORDER BY created_at DESC
  LIMIT 1;

  SELECT decrypted_secret
  INTO cron_secret_value
  FROM vault.decrypted_secrets
  WHERE name = 'cron_secret'
  ORDER BY created_at DESC
  LIMIT 1;

  IF COALESCE(project_url_secret, '') = '' THEN
    RAISE EXCEPTION 'Missing Vault secret: project_url';
  END IF;

  IF COALESCE(anon_key_secret, '') = '' THEN
    RAISE EXCEPTION 'Missing Vault secret: anon_key';
  END IF;

  IF COALESCE(cron_secret_value, '') = '' THEN
    RAISE EXCEPTION 'Missing Vault secret: cron_secret';
  END IF;

  SELECT jobid
  INTO existing_job_id
  FROM cron.job
  WHERE jobname = target_job_name
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    target_job_name,
    job_schedule,
    format(
      $request$
      select
        net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || %L
          ),
          body := jsonb_build_object(
            'action', 'process-pending',
            'cronSecret', %L
          ),
          timeout_milliseconds := 10000
        ) as request_id;
      $request$,
      project_url_secret || '/functions/v1/instagram-publisher',
      anon_key_secret,
      cron_secret_value
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, cron, net;

REVOKE ALL ON FUNCTION public.configure_instagram_publisher_cron(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.configure_instagram_publisher_cron(TEXT) TO postgres;

DO $$
BEGIN
  BEGIN
    PERFORM public.configure_instagram_publisher_cron('*/5 * * * *');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Unable to configure instagram publisher cron automatically: %', SQLERRM;
  END;
END $$;