-- Normalize quiz results semantics and tighten quiz language defaults.

ALTER TABLE quiz_results
ADD COLUMN IF NOT EXISTS quiz_type quiz_type;

UPDATE quiz_results qr
SET quiz_type = q.type
FROM quizzes q
WHERE q.id = qr.quiz_id
  AND qr.quiz_type IS NULL;

UPDATE quiz_results qr
SET result_type = CASE
  WHEN qr.result_type IN ('TRIVIA_SUM', 'PERSONALITY_TALLY') THEN qr.result_type
  WHEN q.type = 'TRIVIA' THEN 'TRIVIA_SUM'
  ELSE 'PERSONALITY_TALLY'
END
FROM quizzes q
WHERE q.id = qr.quiz_id;

ALTER TABLE quiz_results
ALTER COLUMN quiz_type SET NOT NULL;

ALTER TABLE quiz_results
ALTER COLUMN result_value DROP NOT NULL;

ALTER TABLE quiz_results
DROP CONSTRAINT IF EXISTS quiz_results_result_type_valid;

ALTER TABLE quiz_results
ADD CONSTRAINT quiz_results_result_type_valid
CHECK (result_type IN ('TRIVIA_SUM', 'PERSONALITY_TALLY'));

ALTER TABLE quizzes
DROP CONSTRAINT IF EXISTS quizzes_language_valid;

ALTER TABLE quizzes
ADD CONSTRAINT quizzes_language_valid
CHECK (language IN ('pt', 'en', 'es'));

UPDATE quizzes
SET settings = jsonb_strip_nulls(
  jsonb_build_object(
    'show_correct_answers',
      CASE
        WHEN jsonb_typeof(settings->'show_correct_answers') = 'boolean'
          AND (settings->>'show_correct_answers')::boolean IS DISTINCT FROM true
          THEN (settings->>'show_correct_answers')::boolean
        WHEN jsonb_typeof(settings->'showResults') = 'boolean'
          AND (settings->>'showResults')::boolean IS DISTINCT FROM true
          THEN (settings->>'showResults')::boolean
        ELSE NULL
      END,
    'randomize_questions',
      CASE
        WHEN jsonb_typeof(settings->'randomize_questions') = 'boolean'
          AND (settings->>'randomize_questions')::boolean IS DISTINCT FROM false
          THEN (settings->>'randomize_questions')::boolean
        WHEN jsonb_typeof(settings->'randomizeQuestions') = 'boolean'
          AND (settings->>'randomizeQuestions')::boolean IS DISTINCT FROM false
          THEN (settings->>'randomizeQuestions')::boolean
        ELSE NULL
      END,
    'time_limit_seconds',
      CASE
        WHEN jsonb_typeof(settings->'time_limit_seconds') = 'number'
          AND NULLIF(settings->>'time_limit_seconds', '') IS NOT NULL
          THEN (settings->>'time_limit_seconds')::integer
        ELSE NULL
      END
  )
)
WHERE settings IS NOT NULL;

UPDATE profiles
SET banner_source = 'external'
WHERE banner_source = 'storage'
  AND banner_url IS NOT NULL
  AND banner_path IS NULL;

CREATE INDEX IF NOT EXISTS idx_quiz_tags_tag_id ON quiz_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);

CREATE OR REPLACE FUNCTION sync_quiz_tags(p_quiz_id UUID, p_tags TEXT[])
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  normalized_tags TEXT[];
BEGIN
  SELECT COALESCE(array_agg(tag), '{}'::TEXT[])
  INTO normalized_tags
  FROM (
    SELECT DISTINCT lower(trim(raw_tag)) AS tag
    FROM unnest(COALESCE(p_tags, '{}'::TEXT[])) AS raw_tag
    WHERE trim(raw_tag) <> ''
    ORDER BY tag
    LIMIT 20
  ) normalized;

  DELETE FROM quiz_tags WHERE quiz_id = p_quiz_id;

  INSERT INTO tags (slug)
  SELECT unnest(normalized_tags)
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO quiz_tags (quiz_id, tag_id)
  SELECT p_quiz_id, tags.id
  FROM tags
  WHERE tags.slug = ANY(normalized_tags)
  ON CONFLICT DO NOTHING;

  UPDATE quizzes
  SET tags = normalized_tags
  WHERE id = p_quiz_id;

  UPDATE tags
  SET quiz_count = (
    SELECT count(*)::INTEGER
    FROM quiz_tags
    WHERE quiz_tags.tag_id = tags.id
  );
END;
$$;

REVOKE ALL ON FUNCTION sync_quiz_tags(UUID, TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION sync_quiz_tags(UUID, TEXT[]) TO service_role;

DO $$
DECLARE
  quiz_record RECORD;
BEGIN
  FOR quiz_record IN
    SELECT
      q.id,
      COALESCE(tag_data.tags, q.tags, '{}'::TEXT[]) AS tags
    FROM quizzes q
    LEFT JOIN LATERAL (
      SELECT array_agg(t.slug ORDER BY t.slug) AS tags
      FROM quiz_tags qt
      JOIN tags t ON t.id = qt.tag_id
      WHERE qt.quiz_id = q.id
    ) tag_data ON true
  LOOP
    PERFORM sync_quiz_tags(quiz_record.id, quiz_record.tags);
  END LOOP;
END;
$$;

ALTER FUNCTION calculate_level(INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION handle_quiz_result() SET search_path = public, pg_temp;
ALTER FUNCTION increment_quiz_attempts(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION reset_leaderboard_periods() SET search_path = public, pg_temp;
ALTER FUNCTION increment_quiz_likes(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION decrement_quiz_likes(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION quizzes_search_vector_update() SET search_path = public, pg_temp;
ALTER FUNCTION check_user_achievements(UUID) SET search_path = public, pg_temp;
ALTER FUNCTION check_creator_achievements() SET search_path = public, pg_temp;
ALTER FUNCTION get_leaderboard_window(TEXT, INTEGER, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION get_my_leaderboard_rank(UUID, TEXT) SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION get_leaderboard_window(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION get_my_leaderboard_rank(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard_window(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_my_leaderboard_rank(UUID, TEXT) TO service_role;

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Authors can manage own quizzes" ON quizzes;
CREATE POLICY "Authors can insert own quizzes" ON quizzes
  FOR INSERT WITH CHECK ((select auth.uid()) = author_id);
CREATE POLICY "Authors can update own quizzes" ON quizzes
  FOR UPDATE USING ((select auth.uid()) = author_id)
  WITH CHECK ((select auth.uid()) = author_id);
CREATE POLICY "Authors can delete own quizzes" ON quizzes
  FOR DELETE USING ((select auth.uid()) = author_id);

DROP POLICY IF EXISTS "Users can manage own likes" ON quiz_likes;
CREATE POLICY "Users can create own likes" ON quiz_likes
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own likes" ON quiz_likes
  FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Quiz results viewable by owner or quiz author" ON quiz_results;
CREATE POLICY "Quiz results viewable by owner or quiz author" ON quiz_results
  FOR SELECT USING (
    (select auth.uid()) = user_id OR
    (select auth.uid()) = (SELECT author_id FROM quizzes WHERE quizzes.id = quiz_results.quiz_id)
  );

DROP POLICY IF EXISTS "Users can insert own results" ON quiz_results;
CREATE POLICY "Users can insert own results" ON quiz_results
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own streak" ON user_streaks;
CREATE POLICY "Users can view own streak" ON user_streaks
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own comments" ON quiz_comments;
CREATE POLICY "Users can create own comments" ON quiz_comments
  FOR INSERT WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM quizzes
      WHERE quizzes.id = quiz_comments.quiz_id
        AND quizzes.status = 'PUBLISHED'
    )
  );

DROP POLICY IF EXISTS "Users can delete own comments" ON quiz_comments;
CREATE POLICY "Users can delete own comments" ON quiz_comments
  FOR DELETE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Quiz images public read" ON storage.objects;
DROP POLICY IF EXISTS "Profile media public read" ON storage.objects;
