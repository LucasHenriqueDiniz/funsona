-- Archive the "ideal anime girlfriend" quiz (owner decision, 2026-10-19). Its premise is a romantic
-- match among anime characters, several of them teenagers and one from an ecchi series, which sits
-- against Google's child-sexualization policy. It leaves the curated core: the core is now 69.
-- Undo: the quizzes export taken 2026-10-19 02:18 UTC, or D1 Time Travel to before this write.
UPDATE quizzes
SET status = 'ARCHIVED',
    ads_eligible = 0,
    updated_at = STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE slug = 'qual-garota-de-anime-e-o-seu-verdadeiro-amor-descubra-sua-waifu-ideal'
  AND author_id = '00000000-0000-0000-0000-000000000000';
