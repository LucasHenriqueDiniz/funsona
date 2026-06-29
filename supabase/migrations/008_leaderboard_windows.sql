-- Leaderboard by time window without relying on periodic resets

CREATE OR REPLACE FUNCTION get_leaderboard_window(
  p_window TEXT DEFAULT 'all_time',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  xp BIGINT,
  handle TEXT,
  display_name TEXT,
  avatar_url TEXT,
  level INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_window = 'weekly' THEN
    RETURN QUERY
      SELECT
        qr.user_id,
        SUM(qr.xp_gained)::BIGINT AS xp,
        p.handle,
        p.display_name,
        p.avatar_url,
        p.level
      FROM quiz_results qr
      JOIN profiles p ON p.id = qr.user_id
      WHERE qr.user_id IS NOT NULL
        AND qr.created_at >= date_trunc('week', now())
      GROUP BY qr.user_id, p.handle, p.display_name, p.avatar_url, p.level
      ORDER BY xp DESC
      LIMIT p_limit OFFSET p_offset;
  ELSIF p_window = 'monthly' THEN
    RETURN QUERY
      SELECT
        qr.user_id,
        SUM(qr.xp_gained)::BIGINT AS xp,
        p.handle,
        p.display_name,
        p.avatar_url,
        p.level
      FROM quiz_results qr
      JOIN profiles p ON p.id = qr.user_id
      WHERE qr.user_id IS NOT NULL
        AND qr.created_at >= date_trunc('month', now())
      GROUP BY qr.user_id, p.handle, p.display_name, p.avatar_url, p.level
      ORDER BY xp DESC
      LIMIT p_limit OFFSET p_offset;
  ELSE
    RETURN QUERY
      SELECT
        l.user_id,
        l.xp_all_time::BIGINT AS xp,
        p.handle,
        p.display_name,
        p.avatar_url,
        p.level
      FROM leaderboard l
      JOIN profiles p ON p.id = l.user_id
      ORDER BY l.xp_all_time DESC
      LIMIT p_limit OFFSET p_offset;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_my_leaderboard_rank(
  p_user_id UUID,
  p_window TEXT DEFAULT 'all_time'
)
RETURNS TABLE (
  rank BIGINT,
  xp BIGINT,
  handle TEXT,
  display_name TEXT,
  avatar_url TEXT,
  level INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_window = 'weekly' THEN
    RETURN QUERY
      WITH scores AS (
        SELECT qr.user_id, SUM(qr.xp_gained)::BIGINT AS xp
        FROM quiz_results qr
        WHERE qr.user_id IS NOT NULL
          AND qr.created_at >= date_trunc('week', now())
        GROUP BY qr.user_id
      ), ranked AS (
        SELECT
          s.user_id,
          s.xp,
          RANK() OVER (ORDER BY s.xp DESC) AS rank
        FROM scores s
      )
      SELECT
        r.rank,
        r.xp,
        p.handle,
        p.display_name,
        p.avatar_url,
        p.level
      FROM ranked r
      JOIN profiles p ON p.id = r.user_id
      WHERE r.user_id = p_user_id;
  ELSIF p_window = 'monthly' THEN
    RETURN QUERY
      WITH scores AS (
        SELECT qr.user_id, SUM(qr.xp_gained)::BIGINT AS xp
        FROM quiz_results qr
        WHERE qr.user_id IS NOT NULL
          AND qr.created_at >= date_trunc('month', now())
        GROUP BY qr.user_id
      ), ranked AS (
        SELECT
          s.user_id,
          s.xp,
          RANK() OVER (ORDER BY s.xp DESC) AS rank
        FROM scores s
      )
      SELECT
        r.rank,
        r.xp,
        p.handle,
        p.display_name,
        p.avatar_url,
        p.level
      FROM ranked r
      JOIN profiles p ON p.id = r.user_id
      WHERE r.user_id = p_user_id;
  ELSE
    RETURN QUERY
      WITH ranked AS (
        SELECT
          l.user_id,
          l.xp_all_time::BIGINT AS xp,
          RANK() OVER (ORDER BY l.xp_all_time DESC) AS rank
        FROM leaderboard l
      )
      SELECT
        r.rank,
        r.xp,
        p.handle,
        p.display_name,
        p.avatar_url,
        p.level
      FROM ranked r
      JOIN profiles p ON p.id = r.user_id
      WHERE r.user_id = p_user_id;
  END IF;
END;
$$;
