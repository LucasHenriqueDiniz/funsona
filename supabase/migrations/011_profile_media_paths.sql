-- 011_profile_media_paths.sql
-- Track storage object paths for avatar/banner replacements

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_path TEXT,
ADD COLUMN IF NOT EXISTS banner_path TEXT;
