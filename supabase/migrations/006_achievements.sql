-- 006_achievements.sql
-- Gamification achievements system

-- Achievement definitions
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  criteria_type TEXT NOT NULL, -- 'quiz_count', 'xp', 'streak', 'likes_received', 'quiz_created'
  criteria_value INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements (many-to-many)
CREATE TABLE user_achievements (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_earned_at ON user_achievements(earned_at);

-- Seed initial achievements
INSERT INTO achievements (slug, name, description, icon, criteria_type, criteria_value, xp_reward) VALUES
  ('first_quiz', 'Primeiro Quiz', 'Complete seu primeiro quiz.', '🎯', 'quiz_count', 1, 10),
  ('quizzes_10', 'Curioso', 'Complete 10 quizzes.', '📚', 'quiz_count', 10, 25),
  ('quizzes_50', 'Viciado em Quiz', 'Complete 50 quizzes.', '🔥', 'quiz_count', 50, 50),
  ('quizzes_100', 'Lendário', 'Complete 100 quizzes.', '👑', 'quiz_count', 100, 100),
  ('xp_100', 'Iniciante', 'Acumule 100 XP.', '⭐', 'xp', 100, 0),
  ('xp_500', 'Experiente', 'Acumule 500 XP.', '🌟', 'xp', 500, 0),
  ('xp_1000', 'Mestre', 'Acumule 1.000 XP.', '💎', 'xp', 1000, 0),
  ('xp_5000', 'Grão-Mestre', 'Acumule 5.000 XP.', '🏅', 'xp', 5000, 0),
  ('streak_3', 'Em Ritmo', 'Mantenha uma streak de 3 dias.', '🔥', 'streak', 3, 15),
  ('streak_7', 'Imparável', 'Mantenha uma streak de 7 dias.', '⚡', 'streak', 7, 30),
  ('streak_30', 'Lenda Viva', 'Mantenha uma streak de 30 dias.', '🌙', 'streak', 30, 100),
  ('creator_first', 'Criador', 'Crie seu primeiro quiz.', '✍️', 'quiz_created', 1, 20),
  ('creator_10', 'Produtor', 'Crie 10 quizzes.', '🎬', 'quiz_created', 10, 50),
  ('liked_5', 'Queridinho', 'Receba 5 curtidas nos seus quizzes.', '❤️', 'likes_received', 5, 10),
  ('liked_50', 'Influencer', 'Receba 50 curtidas nos seus quizzes.', '💜', 'likes_received', 50, 50);

-- Function to check and award achievements after quiz result
CREATE OR REPLACE FUNCTION check_user_achievements(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  a RECORD;
  current_xp INTEGER;
  current_streak INTEGER;
  quiz_count INTEGER;
  quiz_created INTEGER;
  likes_received INTEGER;
BEGIN
  -- Get current stats
  SELECT COALESCE(xp, 0), COALESCE(level, 0) INTO current_xp FROM profiles WHERE id = target_user_id;
  SELECT COALESCE(current_streak, 0) INTO current_streak FROM user_streaks WHERE user_id = target_user_id;
  SELECT COUNT(*) INTO quiz_count FROM quiz_results WHERE user_id = target_user_id;
  SELECT COUNT(*) INTO quiz_created FROM quizzes WHERE author_id = target_user_id;
  SELECT COALESCE(SUM(likes_count), 0) INTO likes_received FROM quizzes WHERE author_id = target_user_id;

  FOR a IN SELECT * FROM achievements LOOP
    -- Skip if already earned
    IF EXISTS (SELECT 1 FROM user_achievements WHERE user_id = target_user_id AND achievement_id = a.id) THEN
      CONTINUE;
    END IF;

    -- Check criteria
    IF a.criteria_type = 'quiz_count' AND quiz_count >= a.criteria_value THEN
      INSERT INTO user_achievements (user_id, achievement_id) VALUES (target_user_id, a.id);
      UPDATE profiles SET xp = xp + a.xp_reward WHERE id = target_user_id;
    ELSIF a.criteria_type = 'xp' AND current_xp >= a.criteria_value THEN
      INSERT INTO user_achievements (user_id, achievement_id) VALUES (target_user_id, a.id);
      UPDATE profiles SET xp = xp + a.xp_reward WHERE id = target_user_id;
    ELSIF a.criteria_type = 'streak' AND current_streak >= a.criteria_value THEN
      INSERT INTO user_achievements (user_id, achievement_id) VALUES (target_user_id, a.id);
      UPDATE profiles SET xp = xp + a.xp_reward WHERE id = target_user_id;
    ELSIF a.criteria_type = 'quiz_created' AND quiz_created >= a.criteria_value THEN
      INSERT INTO user_achievements (user_id, achievement_id) VALUES (target_user_id, a.id);
      UPDATE profiles SET xp = xp + a.xp_reward WHERE id = target_user_id;
    ELSIF a.criteria_type = 'likes_received' AND likes_received >= a.criteria_value THEN
      INSERT INTO user_achievements (user_id, achievement_id) VALUES (target_user_id, a.id);
      UPDATE profiles SET xp = xp + a.xp_reward WHERE id = target_user_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Modify handle_quiz_result to also check achievements
CREATE OR REPLACE FUNCTION handle_quiz_result()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  today DATE := CURRENT_DATE;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Update quiz counters
  UPDATE quizzes SET
    attempts_count = attempts_count + 1,
    completions_count = completions_count + 1
  WHERE id = NEW.quiz_id;

  -- Update profile XP and level
  UPDATE profiles SET
    xp = xp + NEW.xp_gained,
    level = calculate_level(xp + NEW.xp_gained)
  WHERE id = NEW.user_id
  RETURNING * INTO user_profile;

  -- Update or insert leaderboard
  INSERT INTO leaderboard (user_id, xp_all_time, xp_weekly, xp_monthly)
  VALUES (NEW.user_id, NEW.xp_gained, NEW.xp_gained, NEW.xp_gained)
  ON CONFLICT (user_id)
  DO UPDATE SET
    xp_all_time = leaderboard.xp_all_time + NEW.xp_gained,
    xp_weekly = leaderboard.xp_weekly + NEW.xp_gained,
    xp_monthly = leaderboard.xp_monthly + NEW.xp_gained,
    updated_at = NOW();

  -- Update streak
  INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date)
  VALUES (NEW.user_id, 1, 1, today)
  ON CONFLICT (user_id)
  DO UPDATE SET
    current_streak = CASE
      WHEN user_streaks.last_activity_date = today THEN user_streaks.current_streak
      WHEN user_streaks.last_activity_date = today - INTERVAL '1 day' THEN user_streaks.current_streak + 1
      ELSE 1
    END,
    longest_streak = GREATEST(
      user_streaks.longest_streak,
      CASE
        WHEN user_streaks.last_activity_date = today THEN user_streaks.current_streak
        WHEN user_streaks.last_activity_date = today - INTERVAL '1 day' THEN user_streaks.current_streak + 1
        ELSE 1
      END
    ),
    last_activity_date = CASE
      WHEN user_streaks.last_activity_date = today THEN today
      ELSE today
    END,
    updated_at = NOW();

  -- Check achievements
  PERFORM check_user_achievements(NEW.user_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check achievements on quiz creation (creator achievements)
CREATE OR REPLACE FUNCTION check_creator_achievements()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.author_id IS NOT NULL THEN
    PERFORM check_user_achievements(NEW.author_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_quiz_insert_achievements
  AFTER INSERT ON quizzes
  FOR EACH ROW
  EXECUTE FUNCTION check_creator_achievements();
