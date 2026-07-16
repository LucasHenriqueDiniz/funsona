-- Slug redirects: preserves SEO equity for quiz slugs whose generation
-- changes (e.g. the slugify() transliteration fix), by mapping old broken
-- slugs to their corrected replacement instead of breaking the URL outright.
CREATE TABLE quiz_slug_redirects (
  old_slug TEXT PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  new_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_slug_redirects_quiz_id ON quiz_slug_redirects(quiz_id);
