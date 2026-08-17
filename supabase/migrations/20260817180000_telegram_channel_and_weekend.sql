-- Telegram channel dedup + settings; gallery weekend tagging
create table if not exists public.telegram_channel_posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  ref_id text not null,
  message_id bigint,
  posted_at timestamptz not null default now(),
  payload jsonb default '{}'::jsonb,
  unique (kind, ref_id)
);
create index if not exists telegram_channel_posts_posted_at_idx on public.telegram_channel_posts (posted_at desc);

create table if not exists public.telegram_channel_settings (
  id int primary key default 1 check (id = 1),
  quiet_enabled boolean not null default false,
  quiet_start text default '23:00',
  quiet_end text default '08:00',
  digest_hours text[] default array['08:00','18:00'],
  auto_kinds jsonb not null default '{"kickoff":true,"fulltime":true,"live_digest":true,"morning_brief":true,"week_ahead":true,"goal":true,"article":true,"video":true,"market_hot":true}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.telegram_channel_settings (id) values (1) on conflict (id) do nothing;

alter table public.gallery_items add column if not exists weekend_key text;
create index if not exists gallery_items_weekend_key_idx on public.gallery_items (weekend_key);
