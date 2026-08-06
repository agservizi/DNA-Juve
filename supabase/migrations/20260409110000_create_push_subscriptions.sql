-- Reconstructed from supabase/schema.sql. This table is required by the
-- subsequent guest subscription migration and by push-notifications.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_token     TEXT,
  endpoint        TEXT NOT NULL UNIQUE,
  subscription    JSONB NOT NULL,
  p256dh          TEXT NOT NULL,
  auth            TEXT NOT NULL,
  user_agent      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_success_at TIMESTAMPTZ,
  last_error      TEXT,
  last_seen_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT push_subscriptions_user_or_guest_check
    CHECK (user_id IS NOT NULL OR guest_token IS NOT NULL)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP POLICY IF EXISTS "Push subscriptions: owner read" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Push subscriptions: owner insert" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Push subscriptions: owner update" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Push subscriptions: owner delete" ON public.push_subscriptions;

CREATE POLICY "Push subscriptions: owner read"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Push subscriptions: owner insert"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Push subscriptions: owner update"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Push subscriptions: owner delete"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_guest_idx
  ON public.push_subscriptions(guest_token);
CREATE INDEX IF NOT EXISTS push_subscriptions_active_idx
  ON public.push_subscriptions(is_active);
