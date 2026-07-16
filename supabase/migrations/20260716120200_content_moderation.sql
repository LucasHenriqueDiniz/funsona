-- Minimal UGC moderation: soft-hide flags on comments plus a generic
-- reports table covering both comments and quizzes. `profiles.is_admin`
-- already exists (001_schema.sql) and gates the admin-only endpoints.
ALTER TABLE quiz_comments
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('comment', 'quiz')),
  target_id UUID NOT NULL,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_action TEXT
);

CREATE INDEX idx_content_reports_target ON content_reports(target_type, target_id);
CREATE INDEX idx_content_reports_unresolved ON content_reports(created_at) WHERE resolved_at IS NULL;

-- One open report per reporter per target — repeated clicks don't spam rows.
CREATE UNIQUE INDEX idx_content_reports_unique_open
  ON content_reports(target_type, target_id, reporter_id)
  WHERE resolved_at IS NULL;
