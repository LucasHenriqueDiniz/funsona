-- Ported from supabase/migrations/20260522141259_normalize_quiz_results_and_quiz_defaults.sql:
-- quiz_results needs to know which quiz type produced it (TRIVIA vs
-- PERSONALITY), independent of result_type, since result_type only
-- distinguishes TRIVIA_SUM/PERSONALITY_TALLY scoring semantics.
ALTER TABLE quiz_results ADD COLUMN quiz_type TEXT;

UPDATE quiz_results
SET quiz_type = (SELECT type FROM quizzes WHERE quizzes.id = quiz_results.quiz_id)
WHERE quiz_type IS NULL;
