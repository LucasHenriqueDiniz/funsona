-- Archive the High School DxD quiz (owner decision, 2026-10-20). High School DxD is an ecchi series
-- about high-school students, and the quiz is framed around seduction and attraction, which sits
-- against Google's child-sexualization policy. A clean rewrite would still be a page about that
-- franchise. It leaves the curated core: the core is now 68.
-- Undo: the quizzes export taken before the batch 3 write, or D1 Time Travel to before this write.
UPDATE quizzes
SET status = 'ARCHIVED',
    ads_eligible = 0,
    updated_at = STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE slug = 'que-personagem-dxd-do-ensino-medio-sou-eu'
  AND author_id = '00000000-0000-0000-0000-000000000000';
