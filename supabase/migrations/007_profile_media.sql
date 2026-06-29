-- 007_profile_media.sql
-- Profile banner field + storage bucket/policies for avatar/banner uploads

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS banner_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-media',
  'profile-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Profile media public read" ON storage.objects;
CREATE POLICY "Profile media public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-media');

DROP POLICY IF EXISTS "Profile media auth insert" ON storage.objects;
CREATE POLICY "Profile media auth insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-media'
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Profile media owner update" ON storage.objects;
CREATE POLICY "Profile media owner update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'profile-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Profile media owner delete" ON storage.objects;
CREATE POLICY "Profile media owner delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
