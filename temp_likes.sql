CREATE OR REPLACE FUNCTION increment_quiz_likes(quiz_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE quizzes SET likes_count = likes_count + 1 WHERE id = quiz_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_quiz_likes(quiz_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE quizzes SET likes_count = GREATEST(0, likes_count - 1) WHERE id = quiz_id;
END;
$$ LANGUAGE plpgsql;
