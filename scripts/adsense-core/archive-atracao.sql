-- Archive the "what kind of attraction do you spark" quiz (owner decision, 2026-10-20). It asks the
-- reader's height, face, body, hair and eye colour to score how attractive they are, which is close
-- to the attractiveness quiz the owner removed in slice 3. It leaves the curated core: the core is now 67.
-- Undo: the quizzes export taken before the batch 4 write, or D1 Time Travel to before this write.
UPDATE quizzes
SET status = 'ARCHIVED',
    ads_eligible = 0,
    updated_at = STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE slug = 'como-sou-atraente-teste-de-atracao-e-autoconfianca'
  AND author_id = '00000000-0000-0000-0000-000000000000';
