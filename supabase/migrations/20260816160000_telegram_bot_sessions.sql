create table if not exists public.telegram_bot_sessions (
  chat_id bigint primary key,
  step text not null default 'idle',
  draft jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.telegram_bot_sessions is 'Conversation state for BianconeriHub Telegram article bot';

alter table public.telegram_bot_sessions enable row level security;

-- Service role only; no public policies on purpose.
