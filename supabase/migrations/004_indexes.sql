-- 004_indexes.sql
-- Performance indexes for common queries

-- Profiles
CREATE INDEX idx_profiles_handle ON profiles(handle);

-- Quizzes
CREATE INDEX idx_quizzes_slug ON quizzes(slug);
CREATE INDEX idx_quizzes_author ON quizzes(author_id);
CREATE INDEX idx_quizzes_status_created ON quizzes(status, created_at DESC);
CREATE INDEX idx_quizzes_language ON quizzes(language);
CREATE INDEX idx_quizzes_type ON quizzes(type);

-- Full-text search on quizzes (portuguese config)
ALTER TABLE quizzes ADD COLUMN search_vector tsvector;

CREATE OR REPLACE FUNCTION quizzes_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('portuguese', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('portuguese', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quizzes_search_vector_update
BEFORE INSERT OR UPDATE ON quizzes
FOR EACH ROW
EXECUTE FUNCTION quizzes_search_vector_update();

CREATE INDEX idx_quizzes_search ON quizzes USING GIN(search_vector);

-- Quiz results
CREATE INDEX idx_quiz_results_quiz ON quiz_results(quiz_id);
CREATE INDEX idx_quiz_results_user ON quiz_results(user_id);

-- Quiz likes/favorites
CREATE INDEX idx_quiz_likes_user ON quiz_likes(user_id);
CREATE INDEX idx_quiz_favorites_user ON quiz_favorites(user_id);

-- Leaderboard
CREATE INDEX idx_leaderboard_weekly ON leaderboard(xp_weekly DESC);
CREATE INDEX idx_leaderboard_monthly ON leaderboard(xp_monthly DESC);
CREATE INDEX idx_leaderboard_alltime ON leaderboard(xp_all_time DESC);
