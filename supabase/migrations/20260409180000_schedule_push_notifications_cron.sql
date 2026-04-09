CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.configure_push_notifications_cron(job_schedule TEXT DEFAULT '* * * * *')
RETURNS void AS $$
DECLARE
  target_job_name CONSTANT TEXT := 'process-reader-notifications';
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
            'secret', %L
          ),
          timeout_milliseconds := 10000
        ) as request_id;
      $request$,
      project_url_secret || '/functions/v1/push-notifications',
      anon_key_secret,
      cron_secret_value
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, cron, net;

REVOKE ALL ON FUNCTION public.configure_push_notifications_cron(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.configure_push_notifications_cron(TEXT) TO postgres;