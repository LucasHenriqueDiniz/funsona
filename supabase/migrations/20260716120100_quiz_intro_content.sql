-- Adds structured editorial context to quizzes, rendered on the indexable
-- quiz landing page (apps/web/src/pages/quiz/[slug].astro) alongside the
-- short `description`. Nullable/optional: existing quizzes are unaffected
-- until an author backfills it; new quizzes are encouraged (not forced)
-- to include it via the QuizEditor UI.
ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS intro_content JSONB;
