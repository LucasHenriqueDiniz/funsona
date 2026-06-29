-- 001_schema.sql
-- Initial schema for QuizHub v2

-- Enums
CREATE TYPE quiz_type AS ENUM ('TRIVIA', 'PERSONALITY');
CREATE TYPE quiz_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- Profiles (linked to Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  is_premium BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quizzes
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  type quiz_type NOT NULL,
  status quiz_status DEFAULT 'DRAFT',
  content JSONB NOT NULL,
  settings JSONB DEFAULT '{}',
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'pt',
  tags TEXT[] DEFAULT '{}',
  likes_count INTEGER DEFAULT 0,
  favorites_count INTEGER DEFAULT 0,
  attempts_count INTEGER DEFAULT 0,
  completions_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags (normalized reference table)
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  quiz_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz-Tags join table
CREATE TABLE quiz_tags (
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (quiz_id, tag_id)
);

-- Likes
CREATE TABLE quiz_likes (
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (quiz_id, user_id)
);

-- Favorites
CREATE TABLE quiz_favorites (
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (quiz_id, user_id)
);

-- Quiz Results
CREATE TABLE quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  result_type TEXT NOT NULL,
  result_value TEXT NOT NULL,
  xp_gained INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Streaks
CREATE TABLE user_streaks (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard (aggregated)
CREATE TABLE leaderboard (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  xp_all_time INTEGER DEFAULT 0,
  xp_weekly INTEGER DEFAULT 0,
  xp_monthly INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_streaks_updated_at BEFORE UPDATE ON user_streaks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboard_updated_at BEFORE UPDATE ON leaderboard
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
