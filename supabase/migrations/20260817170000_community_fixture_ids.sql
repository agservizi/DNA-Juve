alter table public.community_predictions add column if not exists match_id text;
alter table public.community_diary_entries add column if not exists match_id text;
alter table public.community_predictions add column if not exists scored boolean default false;
alter table public.community_predictions add column if not exists points integer default 0;
create index if not exists community_predictions_match_id_idx on public.community_predictions (match_id);
