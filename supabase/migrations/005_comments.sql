-- 005_comments.sql
-- Quiz comments system

CREATE TABLE quiz_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_comments_quiz_id ON quiz_comments(quiz_id);
CREATE INDEX idx_quiz_comments_user_id ON quiz_comments(user_id);
CREATE INDEX idx_quiz_comments_created_at ON quiz_comments(created_at);

-- Trigger to update timestamps
CREATE TRIGGER update_quiz_comments_updated_at BEFORE UPDATE ON quiz_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
