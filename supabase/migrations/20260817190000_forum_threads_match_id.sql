-- Match-day forum threads keyed by football Match.id
alter table public.forum_threads add column if not exists match_id text;
create unique index if not exists forum_threads_match_id_uidx on public.forum_threads (match_id) where match_id is not null;
create index if not exists forum_threads_match_id_idx on public.forum_threads (match_id);
