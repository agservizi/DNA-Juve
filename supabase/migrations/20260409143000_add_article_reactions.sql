CREATE TABLE IF NOT EXISTS article_reactions (
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (article_id, user_id)
);

DROP TRIGGER IF EXISTS article_reactions_updated_at ON article_reactions;
CREATE TRIGGER article_reactions_updated_at
  BEFORE UPDATE ON article_reactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE article_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Article reactions: public read" ON article_reactions;
DROP POLICY IF EXISTS "Article reactions: owner insert" ON article_reactions;
DROP POLICY IF EXISTS "Article reactions: owner update" ON article_reactions;
DROP POLICY IF EXISTS "Article reactions: owner delete" ON article_reactions;

CREATE POLICY "Article reactions: public read"
  ON article_reactions FOR SELECT
  USING (true);

CREATE POLICY "Article reactions: owner insert"
  ON article_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Article reactions: owner update"
  ON article_reactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Article reactions: owner delete"
  ON article_reactions FOR DELETE
  USING (auth.uid() = user_id OR is_admin_user(auth.uid()));

CREATE INDEX IF NOT EXISTS article_reactions_article_idx
  ON article_reactions(article_id, emoji);
