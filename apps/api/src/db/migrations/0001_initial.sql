-- Initial D1 (SQLite) schema, ported from supabase/migrations/*.sql.
--
-- Adaptations from Postgres:
--   UUID          -> TEXT (values still generated as UUID strings by the app)
--   ENUM          -> TEXT + CHECK constraint
--   JSONB         -> TEXT (JSON.stringify/parse in the app layer)
--   TEXT[]        -> TEXT (JSON array, e.g. '["a","b"]')
--   TIMESTAMPTZ   -> TEXT (ISO 8601, e.g. '2026-07-26T12:00:00.000Z')
--   DATE          -> TEXT ('YYYY-MM-DD')
--   auth.users FK -> dropped; profiles.id stores the external auth provider's
--                    user id (Clerk), there is no local users table.
-- Postgres trigger/RPC business logic (handle_quiz_result, check_user_achievements,
-- check_creator_achievements, get_leaderboard_window, get_my_leaderboard_rank,
-- calculate_level) is NOT ported as SQL here — it is reimplemented as TypeScript
-- in apps/api/src/routes so it stays testable and portable.

CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  avatar_path TEXT,
  avatar_source TEXT DEFAULT 'external' CHECK (avatar_source IN ('external', 'storage')),
  banner_url TEXT,
  banner_path TEXT,
  banner_source TEXT DEFAULT 'storage' CHECK (banner_source IN ('external', 'storage')),
  bio TEXT,
  email TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  is_premium INTEGER DEFAULT 0,
  is_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE quizzes (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('TRIVIA', 'PERSONALITY')),
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  content TEXT NOT NULL,
  intro_content TEXT,
  settings TEXT DEFAULT '{}',
  author_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'pt',
  tags TEXT DEFAULT '[]',
  likes_count INTEGER DEFAULT 0,
  favorites_count INTEGER DEFAULT 0,
  attempts_count INTEGER DEFAULT 0,
  completions_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_quizzes_slug ON quizzes(slug);
CREATE INDEX idx_quizzes_author_id ON quizzes(author_id);
CREATE INDEX idx_quizzes_status ON quizzes(status);

-- Simple text search over title/description/tags. D1/SQLite has FTS5, but with
-- 769 rows a plain LIKE-based filter in the app is enough; move to an FTS5
-- virtual table only if search quality/perf becomes an issue.

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  quiz_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE quiz_tags (
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (quiz_id, tag_id)
);

CREATE TABLE quiz_likes (
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (quiz_id, user_id)
);

CREATE TABLE quiz_favorites (
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (quiz_id, user_id)
);

CREATE TABLE quiz_results (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  result_type TEXT NOT NULL,
  result_value TEXT NOT NULL,
  xp_gained INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_quiz_results_quiz_id ON quiz_results(quiz_id);
CREATE INDEX idx_quiz_results_user_id ON quiz_results(user_id);

CREATE TABLE user_streaks (
  user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date TEXT,
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE leaderboard (
  user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  xp_all_time INTEGER DEFAULT 0,
  xp_weekly INTEGER DEFAULT 0,
  xp_monthly INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE quiz_comments (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_quiz_comments_quiz_id ON quiz_comments(quiz_id);
CREATE INDEX idx_quiz_comments_user_id ON quiz_comments(user_id);
CREATE INDEX idx_quiz_comments_created_at ON quiz_comments(created_at);

CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  criteria_type TEXT NOT NULL,
  criteria_value INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE user_achievements (
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_earned_at ON user_achievements(earned_at);

CREATE TABLE quiz_slug_redirects (
  old_slug TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  new_slug TEXT NOT NULL,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_quiz_slug_redirects_quiz_id ON quiz_slug_redirects(quiz_id);

CREATE TABLE content_reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('comment', 'quiz')),
  target_id TEXT NOT NULL,
  reporter_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TEXT DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at TEXT,
  resolved_action TEXT
);

CREATE INDEX idx_content_reports_target ON content_reports(target_type, target_id);
CREATE INDEX idx_content_reports_unresolved ON content_reports(created_at) WHERE resolved_at IS NULL;

-- One open report per reporter per target — repeated clicks don't spam rows.
CREATE UNIQUE INDEX idx_content_reports_unique_open
  ON content_reports(target_type, target_id, reporter_id)
  WHERE resolved_at IS NULL;

-- Seed achievements (same 15 rows as supabase/migrations/006_achievements.sql).
-- IDs are deterministic slug-based strings here (D1 has no gen_random_uuid()
-- default); the app never needs to guess an achievement's id, only its slug.
INSERT INTO achievements (id, slug, name, description, icon, criteria_type, criteria_value, xp_reward) VALUES
  ('ach_first_quiz',    'first_quiz',    'Primeiro Quiz',       'Complete seu primeiro quiz.',              '🎯', 'quiz_count',     1,   10),
  ('ach_quizzes_10',    'quizzes_10',    'Curioso',             'Complete 10 quizzes.',                     '📚', 'quiz_count',     10,  25),
  ('ach_quizzes_50',    'quizzes_50',    'Viciado em Quiz',     'Complete 50 quizzes.',                     '🔥', 'quiz_count',     50,  50),
  ('ach_quizzes_100',   'quizzes_100',   'Lendário',            'Complete 100 quizzes.',                    '👑', 'quiz_count',     100, 100),
  ('ach_xp_100',        'xp_100',        'Iniciante',           'Acumule 100 XP.',                          '⭐', 'xp',             100, 0),
  ('ach_xp_500',        'xp_500',        'Experiente',          'Acumule 500 XP.',                          '🌟', 'xp',             500, 0),
  ('ach_xp_1000',       'xp_1000',       'Mestre',              'Acumule 1.000 XP.',                        '💎', 'xp',             1000,0),
  ('ach_xp_5000',       'xp_5000',       'Grão-Mestre',         'Acumule 5.000 XP.',                        '🏅', 'xp',             5000,0),
  ('ach_streak_3',      'streak_3',      'Em Ritmo',            'Mantenha uma streak de 3 dias.',           '🔥', 'streak',         3,   15),
  ('ach_streak_7',      'streak_7',      'Imparável',           'Mantenha uma streak de 7 dias.',           '⚡', 'streak',         7,   30),
  ('ach_streak_30',     'streak_30',     'Lenda Viva',          'Mantenha uma streak de 30 dias.',          '🌙', 'streak',         30,  100),
  ('ach_creator_first', 'creator_first', 'Criador',             'Crie seu primeiro quiz.',                  '✍️', 'quiz_created',   1,   20),
  ('ach_creator_10',    'creator_10',    'Produtor',            'Crie 10 quizzes.',                         '🎬', 'quiz_created',   10,  50),
  ('ach_liked_5',       'liked_5',       'Queridinho',          'Receba 5 curtidas nos seus quizzes.',      '❤️', 'likes_received', 5,   10),
  ('ach_liked_50',      'liked_50',      'Influencer',          'Receba 50 curtidas nos seus quizzes.',     '💜', 'likes_received', 50,  50);
