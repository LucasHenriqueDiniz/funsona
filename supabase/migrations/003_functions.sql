-- 003_functions.sql
-- Business logic triggers and helper functions

-- XP calculation: level = floor(sqrt(xp / 50)) + 1
CREATE OR REPLACE FUNCTION calculate_level(xp_val INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN GREATEST(1, FLOOR(SQRT(xp_val::float / 50)) + 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- After quiz result inserted: update profile XP, level, and streak
CREATE OR REPLACE FUNCTION handle_quiz_result()
RETURNS TRIGGER AS $$
DECLARE
  user_profile RECORD;
  today DATE := CURRENT_DATE;
BEGIN
  -- Only process if user_id is present
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_quiz_result_insert
  AFTER INSERT ON quiz_results
  FOR EACH ROW
  EXECUTE FUNCTION handle_quiz_result();

-- Helper to increment quiz attempts without full result (for abandoned plays)
CREATE OR REPLACE FUNCTION increment_quiz_attempts(quiz_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE quizzes SET attempts_count = attempts_count + 1 WHERE id = quiz_id;
END;
$$ LANGUAGE plpgsql;

-- Reset weekly/monthly leaderboard (run via cron or scheduled function)
CREATE OR REPLACE FUNCTION reset_leaderboard_periods()
RETURNS VOID AS $$
BEGIN
  -- Reset weekly every Monday
  UPDATE leaderboard SET xp_weekly = 0 WHERE EXTRACT(DOW FROM NOW()) = 1;

  -- Reset monthly on 1st of month
  UPDATE leaderboard SET xp_monthly = 0 WHERE EXTRACT(DAY FROM NOW()) = 1;
END;
$$ LANGUAGE plpgsql;

-- Increment quiz likes count
CREATE OR REPLACE FUNCTION increment_quiz_likes(quiz_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE quizzes SET likes_count = likes_count + 1 WHERE id = quiz_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement quiz likes count
CREATE OR REPLACE FUNCTION decrement_quiz_likes(quiz_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE quizzes SET likes_count = GREATEST(0, likes_count - 1) WHERE id = quiz_id;
END;
$$ LANGUAGE plpgsql;
