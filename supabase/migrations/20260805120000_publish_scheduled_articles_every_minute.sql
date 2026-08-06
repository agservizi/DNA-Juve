-- Pubblicazione programmata atomica, eseguita direttamente da Postgres ogni minuto.
-- Non dipende da traffico web, Vercel o segreti HTTP.
create extension if not exists pg_cron with schema extensions;

create or replace function public.publish_due_articles(batch_limit integer default 100)
returns table(id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  with due as (
    select a.id
    from public.articles a
    where a.status = 'draft'
      and a.scheduled_at is not null
      and a.scheduled_at <= now()
    order by a.scheduled_at asc
    for update skip locked
    limit greatest(1, least(coalesce(batch_limit, 100), 500))
  )
  update public.articles a
  set status = 'published',
      published_at = coalesce(a.scheduled_at, now()),
      scheduled_at = null,
      updated_at = now()
  from due
  where a.id = due.id
    and a.status = 'draft'
  returning a.id;
end;
$$;

revoke all on function public.publish_due_articles(integer) from public, anon, authenticated;
grant execute on function public.publish_due_articles(integer) to service_role;

-- Mantiene compatibilità con eventuali job precedenti, usando però lo stesso
-- percorso atomico e senza lasciare l'RPC esposta ai client pubblici.
create or replace function public.publish_scheduled_articles()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.publish_due_articles(500);
end;
$$;

revoke all on function public.publish_scheduled_articles() from public, anon, authenticated;
grant execute on function public.publish_scheduled_articles() to service_role;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'publish-scheduled-articles' limit 1;
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule(
    'publish-scheduled-articles',
    '* * * * *',
    'select public.publish_due_articles(100);'
  );
end $$;
