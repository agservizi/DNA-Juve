-- Admin/editorial writes must never be granted to every authenticated account.
-- Public read/participation policies remain unchanged.

DROP POLICY IF EXISTS "Categories: auth write" ON categories;
CREATE POLICY "Categories: admin write" ON categories FOR ALL
  USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Articles: auth insert" ON articles;
DROP POLICY IF EXISTS "Articles: auth update" ON articles;
DROP POLICY IF EXISTS "Articles: auth delete" ON articles;
CREATE POLICY "Articles: admin insert" ON articles FOR INSERT WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Articles: admin update" ON articles FOR UPDATE USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Articles: admin delete" ON articles FOR DELETE USING (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Tags: auth write" ON tags;
CREATE POLICY "Tags: admin write" ON tags FOR ALL
  USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Article tags: auth write" ON article_tags;
CREATE POLICY "Article tags: admin write" ON article_tags FOR ALL
  USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Comments: auth moderate" ON comments;
CREATE POLICY "Comments: admin moderate" ON comments FOR UPDATE
  USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Comments: admin delete" ON comments FOR DELETE USING (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Fan submissions: auth read" ON fan_article_submissions;
DROP POLICY IF EXISTS "Fan submissions: auth update" ON fan_article_submissions;
DROP POLICY IF EXISTS "Fan submissions: auth delete" ON fan_article_submissions;
CREATE POLICY "Fan submissions: admin read" ON fan_article_submissions FOR SELECT USING (is_admin_user(auth.uid()));
CREATE POLICY "Fan submissions: admin update" ON fan_article_submissions FOR UPDATE USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Fan submissions: admin delete" ON fan_article_submissions FOR DELETE USING (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Article polls: auth write" ON article_polls;
CREATE POLICY "Article polls: admin write" ON article_polls FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Article poll options: auth write" ON article_poll_options;
CREATE POLICY "Article poll options: admin write" ON article_poll_options FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Match polls: auth write" ON match_polls;
CREATE POLICY "Match polls: admin write" ON match_polls FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
DROP POLICY IF EXISTS "Match poll options: auth write" ON match_poll_options;
CREATE POLICY "Match poll options: admin write" ON match_poll_options FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Article revisions: auth read" ON article_revisions;
DROP POLICY IF EXISTS "Article revisions: auth write" ON article_revisions;
CREATE POLICY "Article revisions: admin read" ON article_revisions FOR SELECT USING (is_admin_user(auth.uid()));
CREATE POLICY "Article revisions: admin write" ON article_revisions FOR ALL USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Storage: auth upload article-images" ON storage.objects;
DROP POLICY IF EXISTS "Storage: auth update article-images" ON storage.objects;
DROP POLICY IF EXISTS "Storage: auth delete article-images" ON storage.objects;
CREATE POLICY "Storage: admin upload article-images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'article-images' AND is_admin_user(auth.uid()));
CREATE POLICY "Storage: admin update article-images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'article-images' AND is_admin_user(auth.uid()))
  WITH CHECK (bucket_id = 'article-images' AND is_admin_user(auth.uid()));
CREATE POLICY "Storage: admin delete article-images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'article-images' AND is_admin_user(auth.uid()));
