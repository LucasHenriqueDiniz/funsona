-- Clean up MVP schema surface:
-- - comments and achievements are first-class features and need RLS
-- - achievements/tags use stable slugs; labels live in the app i18n layer
-- - favorites are removed in favor of likes
-- - profile media tracks external vs storage-backed assets

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_source TEXT DEFAULT 'external' CHECK (avatar_source IN ('external', 'storage')),
ADD COLUMN IF NOT EXISTS banner_source TEXT DEFAULT 'storage' CHECK (banner_source IN ('external', 'storage'));

UPDATE profiles
SET avatar_source = CASE
  WHEN avatar_path IS NOT NULL THEN 'storage'
  WHEN avatar_url IS NOT NULL THEN 'external'
  ELSE 'external'
END
WHERE avatar_source IS NULL OR avatar_source = 'external';

UPDATE profiles
SET banner_source = CASE
  WHEN banner_path IS NOT NULL THEN 'storage'
  WHEN banner_url IS NOT NULL THEN 'storage'
  ELSE 'storage'
END
WHERE banner_source IS NULL OR banner_source = 'storage';

ALTER TABLE quiz_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments on published quizzes are viewable by everyone" ON quiz_comments;
CREATE POLICY "Comments on published quizzes are viewable by everyone" ON quiz_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM quizzes
      WHERE quizzes.id = quiz_comments.quiz_id
        AND quizzes.status = 'PUBLISHED'
    )
  );

DROP POLICY IF EXISTS "Users can create own comments" ON quiz_comments;
CREATE POLICY "Users can create own comments" ON quiz_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM quizzes
      WHERE quizzes.id = quiz_comments.quiz_id
        AND quizzes.status = 'PUBLISHED'
    )
  );

DROP POLICY IF EXISTS "Users can delete own comments" ON quiz_comments;
CREATE POLICY "Users can delete own comments" ON quiz_comments
  FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Achievements are viewable by everyone" ON achievements;
CREATE POLICY "Achievements are viewable by everyone" ON achievements
  FOR SELECT USING (true);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User achievements are viewable by everyone" ON user_achievements;
CREATE POLICY "User achievements are viewable by everyone" ON user_achievements
  FOR SELECT USING (true);

ALTER TABLE achievements
DROP COLUMN IF EXISTS name,
DROP COLUMN IF EXISTS description;

ALTER TABLE tags
DROP COLUMN IF EXISTS name,
DROP COLUMN IF EXISTS description;

DROP TABLE IF EXISTS quiz_favorites;

ALTER TABLE quizzes
DROP COLUMN IF EXISTS favorites_count;
