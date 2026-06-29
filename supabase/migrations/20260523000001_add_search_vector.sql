-- Add full-text search vector column to quizzes table
ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('portuguese',
        coalesce(title, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(array_to_string(tags, ' '), '')
      )
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_quizzes_search_vector ON quizzes USING GIN (search_vector);
