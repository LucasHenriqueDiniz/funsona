-- 010_quiz_images_storage.sql
-- Public storage bucket for quiz cover/question/result images.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quiz-images',
  'quiz-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Quiz images public read" ON storage.objects;
CREATE POLICY "Quiz images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'quiz-images');

DROP POLICY IF EXISTS "Quiz images auth insert" ON storage.objects;
CREATE POLICY "Quiz images auth insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'quiz-images'
  AND auth.role() = 'authenticated'
);
