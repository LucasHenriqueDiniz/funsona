-- Read-only audit of machine-generated duplicate quiz slugs.
--
-- Targets slugs shaped like `internet-das-coisas-iot-1777921094606`: a normal
-- slug with a raw millisecond Date.now() appended. Where the clean slug also
-- exists as its own quiz, the pair is duplicate content in Google's eyes and
-- reads as "scaled content abuse" during an AdSense review.
--
-- The match is deliberately exact: a hyphen followed by exactly 13 digits at
-- the end of the slug. A millisecond timestamp is 13 digits from 2001 to 2286.
-- The legitimate server-side suffix is `Date.now().toString(36)` (8 chars,
-- normally containing letters), so it will not be caught by this.
--
-- Run against production D1 — read-only, no writes:
--   wrangler d1 execute funsona-db --remote --config apps/api/wrangler.toml \
--     --file scripts/audit-duplicate-slugs.sql
--
-- Nothing here modifies data. Review the output before deciding on a cleanup.

-- 1. Counts: how many timestamped slugs exist, and how many have a clean twin.
SELECT
  'timestamped slugs (total)' AS metric,
  COUNT(*) AS count
FROM quizzes
WHERE slug GLOB '*-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'

UNION ALL

SELECT
  'timestamped slugs WITH a clean twin' AS metric,
  COUNT(*) AS count
FROM quizzes AS dupe
WHERE dupe.slug GLOB '*-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
  AND EXISTS (
    SELECT 1 FROM quizzes AS original
    WHERE original.slug = SUBSTR(dupe.slug, 1, LENGTH(dupe.slug) - 14)
      AND original.id <> dupe.id
  );

-- 2. The duplicate pairs themselves, so you can confirm the content really
--    matches before retiring anything. `keep_slug` is the clean one.
SELECT
  original.slug            AS keep_slug,
  original.status          AS keep_status,
  original.attempts_count  AS keep_attempts,
  dupe.slug                AS retire_slug,
  dupe.status              AS retire_status,
  dupe.attempts_count      AS retire_attempts,
  CASE WHEN original.title = dupe.title THEN 'same' ELSE 'DIFFERENT' END AS title_match,
  CASE WHEN original.content = dupe.content THEN 'same' ELSE 'DIFFERENT' END AS content_match
FROM quizzes AS dupe
JOIN quizzes AS original
  ON original.slug = SUBSTR(dupe.slug, 1, LENGTH(dupe.slug) - 14)
 AND original.id <> dupe.id
WHERE dupe.slug GLOB '*-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
ORDER BY content_match, original.slug;

-- 3. Timestamped slugs with NO clean twin. Not duplicates — just ugly URLs.
--    Renaming these needs a quiz_slug_redirects row each, so handle them
--    separately from (2).
SELECT
  dupe.slug   AS orphan_slug,
  dupe.status AS status,
  dupe.title  AS title
FROM quizzes AS dupe
WHERE dupe.slug GLOB '*-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'
  AND NOT EXISTS (
    SELECT 1 FROM quizzes AS original
    WHERE original.slug = SUBSTR(dupe.slug, 1, LENGTH(dupe.slug) - 14)
      AND original.id <> dupe.id
  )
ORDER BY dupe.slug;
