-- Existing authenticated quiz results were tracked in quiz_results but did not
-- increment quizzes.attempts_count. Preserve anonymous counts and add the
-- historical authenticated attempts once.

UPDATE quizzes q
SET attempts_count = COALESCE(q.attempts_count, 0) + COALESCE(results.result_count, 0)
FROM (
  SELECT quiz_id, COUNT(*)::INTEGER AS result_count
  FROM quiz_results
  WHERE quiz_id IS NOT NULL
  GROUP BY quiz_id
) results
WHERE q.id = results.quiz_id;
