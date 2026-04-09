ALTER TABLE push_subscriptions
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS guest_token TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'push_subscriptions_user_or_guest_check'
  ) THEN
    ALTER TABLE push_subscriptions
      ADD CONSTRAINT push_subscriptions_user_or_guest_check
      CHECK (user_id IS NOT NULL OR guest_token IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS push_subscriptions_guest_idx
  ON push_subscriptions(guest_token);
