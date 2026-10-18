-- The seed account authored the editorial catalogue, and its display name
-- shows on every one of those quiz pages as the author card. "Administrador"
-- reads as a placeholder left behind, not as anyone a visitor or an AdSense
-- reviewer can place. Rename the display name only: the handle stays `admin`,
-- because it is in /profile/admin URLs and renaming it would be a URL change.
-- Reversible: set it back with the inverse UPDATE.
UPDATE profiles
SET display_name = 'Equipe FunSona',
    updated_at = STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = '00000000-0000-0000-0000-000000000000'
  AND display_name = 'Administrador';
