-- Add multi-provider storage support to gallery_items
-- Supports Supabase Storage, Cloudflare Stream, and Cloudflare R2

ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'supabase'
  CHECK (storage_provider IN ('supabase', 'stream', 'r2'));

ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS stream_uid TEXT;
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS r2_key TEXT;

-- Unique constraint on stream_uid (only one per Stream video)
CREATE UNIQUE INDEX IF NOT EXISTS idx_gallery_stream_uid ON gallery_items(stream_uid)
  WHERE stream_uid IS NOT NULL;

-- Unique constraint on r2_key (only one per R2 file)
CREATE UNIQUE INDEX IF NOT EXISTS idx_gallery_r2_key ON gallery_items(r2_key)
  WHERE r2_key IS NOT NULL;

-- Index on storage_provider for filtering queries
CREATE INDEX IF NOT EXISTS idx_gallery_storage_provider ON gallery_items(storage_provider);
