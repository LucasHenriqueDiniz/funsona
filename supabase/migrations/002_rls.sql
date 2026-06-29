-- 002_rls.sql
-- Row Level Security policies

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Quizzes
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published quizzes are viewable by everyone" ON quizzes
  FOR SELECT USING (status = 'PUBLISHED');

CREATE POLICY "Authors can manage own quizzes" ON quizzes
  FOR ALL USING (auth.uid() = author_id);

-- Quiz Tags
ALTER TABLE quiz_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quiz tags are viewable by everyone" ON quiz_tags
  FOR SELECT USING (true);

-- Tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tags are viewable by everyone" ON tags
  FOR SELECT USING (true);

-- Likes
ALTER TABLE quiz_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by everyone" ON quiz_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own likes" ON quiz_likes
  FOR ALL USING (auth.uid() = user_id);

-- Favorites
ALTER TABLE quiz_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Favorites are viewable by everyone" ON quiz_favorites
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own favorites" ON quiz_favorites
  FOR ALL USING (auth.uid() = user_id);

-- Quiz Results
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quiz results viewable by owner or quiz author" ON quiz_results
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid() = (SELECT author_id FROM quizzes WHERE quizzes.id = quiz_results.quiz_id)
  );

CREATE POLICY "Users can insert own results" ON quiz_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Streaks
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak" ON user_streaks
  FOR SELECT USING (auth.uid() = user_id);

-- Leaderboard
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaderboard is viewable by everyone" ON leaderboard
  FOR SELECT USING (true);
