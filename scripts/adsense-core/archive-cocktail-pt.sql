-- Archive the European-Portuguese "signature cocktail" quiz (owner decision, 2026-10-22). It duplicates
-- the pt-BR cocktail quiz rewritten in batch 5; a non-alcoholic rewrite was drafted, and the owner chose
-- to archive instead. It leaves the curated core: the core is now 66.
-- Undo: the quizzes export taken before the batch 7 write, or D1 Time Travel to before this write.
UPDATE quizzes
SET status = 'ARCHIVED',
    ads_eligible = 0,
    updated_at = STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE slug = 'responde-a-estas-perguntas-e-nos-dizemos-te-qual-e-o-teu-cocktail-de-assinatura'
  AND author_id = '00000000-0000-0000-0000-000000000000';
