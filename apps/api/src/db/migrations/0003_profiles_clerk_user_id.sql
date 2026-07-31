-- Links existing profiles to Clerk identities.
--
-- 0001 assumed `profiles.id` would hold the Clerk user id, but the rows carried
-- over from Supabase are keyed by Supabase auth UUIDs. Clerk issues `user_...`
-- ids, so a straight `WHERE id = <clerk id>` lookup misses every pre-existing
-- user — and the lazy-create path in authMiddleware would then mint a fresh
-- empty profile, orphaning their quizzes and resetting XP, premium and admin.
--
-- Rather than rewriting `profiles.id` (referenced by author_id, user_id and
-- reporter_id across seven tables), keep it as the stable internal id and carry
-- the Clerk id alongside it. Resolution order is clerk_user_id, then verified
-- email, then create.

ALTER TABLE profiles ADD COLUMN clerk_user_id TEXT;

-- Partial unique index: many legacy rows are NULL until their owner first signs
-- in, and SQLite treats NULLs as distinct, but being explicit documents intent.
CREATE UNIQUE INDEX idx_profiles_clerk_user_id
  ON profiles(clerk_user_id)
  WHERE clerk_user_id IS NOT NULL;

-- Email is the fallback used to claim a legacy row on first Clerk sign-in.
-- Compared case-insensitively, so index the folded value.
CREATE INDEX idx_profiles_email_lower ON profiles(LOWER(email));

-- Profiles created after the Clerk swap already use the Clerk id as their
-- primary key; seed those so they resolve in a single hop.
UPDATE profiles SET clerk_user_id = id WHERE id LIKE 'user\_%' ESCAPE '\';
