// D1 data-access layer. Raw prepared statements (no ORM) — the schema is
// small and stable enough that this stays readable, and it avoids adding
// drizzle wiring while the rest of the migration is still moving.
import type { Env } from "../index.js";

export function getDb(env: Env["Bindings"]) {
  return env.DB;
}

export function nowIso() {
  return new Date().toISOString();
}

export function newId() {
  return crypto.randomUUID();
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function toBool(value: number | boolean | null | undefined) {
  return !!value;
}

// ─── Profiles ───────────────────────────────────────────────────────────────

export type ProfileRow = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  avatar_path: string | null;
  avatar_source: string | null;
  banner_url: string | null;
  banner_path: string | null;
  banner_source: string | null;
  bio: string | null;
  email: string | null;
  xp: number;
  level: number;
  is_premium: number;
  is_admin: number;
  created_at: string;
  updated_at: string;
};

export function serializeProfile(row: ProfileRow) {
  return { ...row, is_premium: toBool(row.is_premium), is_admin: toBool(row.is_admin) };
}

export async function getProfileById(env: Env["Bindings"], id: string) {
  const row = await getDb(env).prepare("SELECT * FROM profiles WHERE id = ?").bind(id).first<ProfileRow>();
  return row ? serializeProfile(row) : null;
}

export async function getProfileByHandle(env: Env["Bindings"], handle: string) {
  const row = await getDb(env)
    .prepare(
      "SELECT id, handle, display_name, avatar_url, banner_url, bio, level, xp, is_premium, created_at FROM profiles WHERE handle = ?"
    )
    .bind(handle)
    .first<ProfileRow>();
  return row ? serializeProfile(row) : null;
}

export async function isAdmin(env: Env["Bindings"], userId: string) {
  const row = await getDb(env).prepare("SELECT is_admin FROM profiles WHERE id = ?").bind(userId).first<{ is_admin: number }>();
  return !!row?.is_admin;
}

export async function updateProfile(env: Env["Bindings"], id: string, updates: Record<string, unknown>) {
  const cols = Object.keys(updates);
  if (cols.length === 0) return getProfileById(env, id);
  const setClause = cols.map((c) => `${c} = ?`).join(", ");
  await getDb(env)
    .prepare(`UPDATE profiles SET ${setClause}, updated_at = ? WHERE id = ?`)
    .bind(...cols.map((c) => updates[c]), nowIso(), id)
    .run();
  return getProfileById(env, id);
}

// ─── Quizzes ────────────────────────────────────────────────────────────────

export type QuizRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  type: "TRIVIA" | "PERSONALITY";
  status: string;
  content: string;
  intro_content: string | null;
  settings: string | null;
  author_id: string;
  language: string;
  tags: string;
  likes_count: number;
  favorites_count: number;
  attempts_count: number;
  completions_count: number;
  created_at: string;
  updated_at: string;
};

export function serializeQuiz(row: QuizRow, author?: { handle: string; display_name: string; avatar_url: string | null } | null) {
  return {
    ...row,
    content: parseJson(row.content, { questions: [], outcomes: [] }),
    intro_content: parseJson(row.intro_content, null),
    settings: parseJson(row.settings, {}),
    tags: parseJson(row.tags, [] as string[]),
    author: author ?? undefined,
  };
}

async function getAuthorsById(env: Env["Bindings"], authorIds: string[]) {
  if (authorIds.length === 0) return new Map<string, { handle: string; display_name: string; avatar_url: string | null }>();
  const placeholders = authorIds.map(() => "?").join(", ");
  const { results } = await getDb(env)
    .prepare(`SELECT id, handle, display_name, avatar_url FROM profiles WHERE id IN (${placeholders})`)
    .bind(...authorIds)
    .all<{ id: string; handle: string; display_name: string; avatar_url: string | null }>();
  return new Map(results.map((r) => [r.id, { handle: r.handle, display_name: r.display_name, avatar_url: r.avatar_url }]));
}

export async function getQuizBySlug(env: Env["Bindings"], slug: string, statusFilter: string | null = "PUBLISHED") {
  const sql = statusFilter
    ? "SELECT * FROM quizzes WHERE slug = ? AND status = ?"
    : "SELECT * FROM quizzes WHERE slug = ?";
  const row = statusFilter
    ? await getDb(env).prepare(sql).bind(slug, statusFilter).first<QuizRow>()
    : await getDb(env).prepare(sql).bind(slug).first<QuizRow>();
  if (!row) return null;
  const authors = await getAuthorsById(env, [row.author_id]);
  return serializeQuiz(row, authors.get(row.author_id) ?? null);
}

export async function getQuizById(env: Env["Bindings"], id: string) {
  const row = await getDb(env).prepare("SELECT * FROM quizzes WHERE id = ?").bind(id).first<QuizRow>();
  return row;
}

export type ListQuizzesFilters = {
  search?: string;
  tag?: string;
  page: number;
  limit: number;
  sort?: string;
  minAttempts: number;
};

export async function listQuizzes(env: Env["Bindings"], filters: ListQuizzesFilters) {
  const offset = (filters.page - 1) * filters.limit;
  const where: string[] = ["status = 'PUBLISHED'"];
  const params: unknown[] = [];

  if (filters.tag) {
    // tags is stored as a JSON array string; match a quoted element.
    where.push("tags LIKE ?");
    params.push(`%"${filters.tag}"%`);
  }
  if (filters.minAttempts > 0) {
    where.push("attempts_count >= ?");
    params.push(filters.minAttempts);
  }
  if (filters.search) {
    where.push("(title LIKE ? OR description LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  const orderBy =
    filters.sort === "likes" ? "likes_count DESC" : filters.sort === "plays" ? "attempts_count DESC" : "created_at DESC";

  const whereClause = where.join(" AND ");
  const db = getDb(env);

  const { results } = await db
    .prepare(`SELECT * FROM quizzes WHERE ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .bind(...params, filters.limit, offset)
    .all<QuizRow>();

  const countRow = await db.prepare(`SELECT count(*) as n FROM quizzes WHERE ${whereClause}`).bind(...params).first<{ n: number }>();

  const authors = await getAuthorsById(env, [...new Set(results.map((r) => r.author_id))]);
  const data = results.map((r) => serializeQuiz(r, authors.get(r.author_id) ?? null));

  return { data, total: countRow?.n ?? 0 };
}

export async function insertQuiz(
  env: Env["Bindings"],
  quiz: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    cover_url: string | null;
    type: "TRIVIA" | "PERSONALITY";
    status: string;
    content: unknown;
    intro_content: unknown;
    settings: unknown;
    author_id: string;
    language: string;
    tags: string[];
  }
) {
  const now = nowIso();
  await getDb(env)
    .prepare(
      `INSERT INTO quizzes (id, slug, title, description, cover_url, type, status, content, intro_content, settings, author_id, language, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      quiz.id,
      quiz.slug,
      quiz.title,
      quiz.description ?? null,
      quiz.cover_url ?? null,
      quiz.type,
      quiz.status ?? "DRAFT",
      JSON.stringify(quiz.content),
      quiz.intro_content ? JSON.stringify(quiz.intro_content) : null,
      JSON.stringify(quiz.settings ?? {}),
      quiz.author_id,
      quiz.language ?? "pt",
      JSON.stringify(quiz.tags ?? []),
      now,
      now
    )
    .run();
  await checkCreatorAchievements(env, quiz.author_id);
  return getQuizById(env, quiz.id);
}

export async function updateQuiz(env: Env["Bindings"], id: string, updates: Record<string, unknown>) {
  const jsonCols = new Set(["content", "intro_content", "settings", "tags"]);
  const cols = Object.keys(updates);
  if (cols.length === 0) return getQuizById(env, id);
  const setClause = cols.map((c) => `${c} = ?`).join(", ");
  const values = cols.map((c) => (jsonCols.has(c) ? JSON.stringify(updates[c]) : updates[c]));
  await getDb(env)
    .prepare(`UPDATE quizzes SET ${setClause}, updated_at = ? WHERE id = ?`)
    .bind(...values, nowIso(), id)
    .run();
  return getQuizById(env, id);
}

export async function deleteQuiz(env: Env["Bindings"], id: string) {
  await getDb(env).prepare("DELETE FROM quizzes WHERE id = ?").bind(id).run();
}

export async function slugExists(env: Env["Bindings"], slug: string) {
  const row = await getDb(env).prepare("SELECT id FROM quizzes WHERE slug = ?").bind(slug).first<{ id: string }>();
  return !!row;
}

export async function getSlugRedirect(env: Env["Bindings"], oldSlug: string) {
  const row = await getDb(env)
    .prepare("SELECT new_slug FROM quiz_slug_redirects WHERE old_slug = ?")
    .bind(oldSlug)
    .first<{ new_slug: string }>();
  return row?.new_slug ?? null;
}

export async function incrementQuizAttempts(env: Env["Bindings"], quizId: string) {
  await getDb(env).prepare("UPDATE quizzes SET attempts_count = attempts_count + 1 WHERE id = ?").bind(quizId).run();
}

export async function incrementQuizLikes(env: Env["Bindings"], quizId: string) {
  await getDb(env).prepare("UPDATE quizzes SET likes_count = likes_count + 1 WHERE id = ?").bind(quizId).run();
}

export async function decrementQuizLikes(env: Env["Bindings"], quizId: string) {
  await getDb(env)
    .prepare("UPDATE quizzes SET likes_count = MAX(0, likes_count - 1) WHERE id = ?")
    .bind(quizId)
    .run();
}

// ─── Tags ───────────────────────────────────────────────────────────────────

// Ported from supabase's sync_quiz_tags(): normalizes, replaces the join
// rows, and recomputes each tag's quiz_count.
export async function syncQuizTags(env: Env["Bindings"], quizId: string, rawTags: string[]) {
  const db = getDb(env);
  const normalized = [...new Set(rawTags.map((t) => t.trim().toLowerCase()).filter(Boolean))].sort().slice(0, 20);

  await db.prepare("DELETE FROM quiz_tags WHERE quiz_id = ?").bind(quizId).run();

  for (const slug of normalized) {
    const existing = await db.prepare("SELECT id FROM tags WHERE slug = ?").bind(slug).first<{ id: string }>();
    const tagId = existing?.id ?? newId();
    if (!existing) {
      await db.prepare("INSERT INTO tags (id, slug, name, created_at) VALUES (?, ?, ?, ?)").bind(tagId, slug, slug, nowIso()).run();
    }
    await db.prepare("INSERT OR IGNORE INTO quiz_tags (quiz_id, tag_id) VALUES (?, ?)").bind(quizId, tagId).run();
  }

  await db.prepare("UPDATE quizzes SET tags = ? WHERE id = ?").bind(JSON.stringify(normalized), quizId).run();

  const affectedTagIds = await db.prepare("SELECT id FROM tags").all<{ id: string }>();
  for (const { id: tagId } of affectedTagIds.results) {
    const countRow = await db.prepare("SELECT count(*) as n FROM quiz_tags WHERE tag_id = ?").bind(tagId).first<{ n: number }>();
    await db.prepare("UPDATE tags SET quiz_count = ? WHERE id = ?").bind(countRow?.n ?? 0, tagId).run();
  }
}

// ─── Likes ──────────────────────────────────────────────────────────────────

export async function likeQuiz(env: Env["Bindings"], quizId: string, userId: string) {
  const existing = await getDb(env)
    .prepare("SELECT 1 FROM quiz_likes WHERE quiz_id = ? AND user_id = ?")
    .bind(quizId, userId)
    .first();
  if (existing) return;
  await getDb(env)
    .prepare("INSERT INTO quiz_likes (quiz_id, user_id, created_at) VALUES (?, ?, ?)")
    .bind(quizId, userId, nowIso())
    .run();
  await incrementQuizLikes(env, quizId);
}

export async function unlikeQuiz(env: Env["Bindings"], quizId: string, userId: string) {
  const { meta } = await getDb(env)
    .prepare("DELETE FROM quiz_likes WHERE quiz_id = ? AND user_id = ?")
    .bind(quizId, userId)
    .run();
  if (meta.changes > 0) await decrementQuizLikes(env, quizId);
  return meta.changes > 0;
}

export async function hasLiked(env: Env["Bindings"], quizId: string, userId: string) {
  const row = await getDb(env)
    .prepare("SELECT 1 as x FROM quiz_likes WHERE quiz_id = ? AND user_id = ?")
    .bind(quizId, userId)
    .first();
  return !!row;
}

// ─── Quiz results + XP/streak/leaderboard/achievements ─────────────────────
// Ported from handle_quiz_result() (003_functions.sql) and
// check_user_achievements()/check_creator_achievements() (006_achievements.sql).

export function calculateLevel(xp: number) {
  return Math.max(1, Math.floor(Math.sqrt(xp / 50)) + 1);
}

export async function insertQuizResult(
  env: Env["Bindings"],
  input: { quizId: string; userId: string; quizType: "TRIVIA" | "PERSONALITY"; resultType: string; resultValue: string | null; xpGained: number }
) {
  const db = getDb(env);
  const id = newId();
  const now = nowIso();
  const today = now.slice(0, 10);

  await db
    .prepare(
      "INSERT INTO quiz_results (id, quiz_id, user_id, quiz_type, result_type, result_value, xp_gained, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(id, input.quizId, input.userId, input.quizType, input.resultType, input.resultValue ?? "", input.xpGained, now)
    .run();

  await db
    .prepare("UPDATE quizzes SET attempts_count = attempts_count + 1, completions_count = completions_count + 1 WHERE id = ?")
    .bind(input.quizId)
    .run();

  const profile = await db.prepare("SELECT xp FROM profiles WHERE id = ?").bind(input.userId).first<{ xp: number }>();
  const newXp = (profile?.xp ?? 0) + input.xpGained;
  await db
    .prepare("UPDATE profiles SET xp = ?, level = ?, updated_at = ? WHERE id = ?")
    .bind(newXp, calculateLevel(newXp), now, input.userId)
    .run();

  const existingLb = await db.prepare("SELECT user_id FROM leaderboard WHERE user_id = ?").bind(input.userId).first();
  if (existingLb) {
    await db
      .prepare(
        "UPDATE leaderboard SET xp_all_time = xp_all_time + ?, xp_weekly = xp_weekly + ?, xp_monthly = xp_monthly + ?, updated_at = ? WHERE user_id = ?"
      )
      .bind(input.xpGained, input.xpGained, input.xpGained, now, input.userId)
      .run();
  } else {
    await db
      .prepare("INSERT INTO leaderboard (user_id, xp_all_time, xp_weekly, xp_monthly, updated_at) VALUES (?, ?, ?, ?, ?)")
      .bind(input.userId, input.xpGained, input.xpGained, input.xpGained, now)
      .run();
  }

  const streak = await db
    .prepare("SELECT current_streak, longest_streak, last_activity_date FROM user_streaks WHERE user_id = ?")
    .bind(input.userId)
    .first<{ current_streak: number; longest_streak: number; last_activity_date: string | null }>();

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (!streak) {
    await db
      .prepare("INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date, updated_at) VALUES (?, 1, 1, ?, ?)")
      .bind(input.userId, today, now)
      .run();
  } else if (streak.last_activity_date !== today) {
    const nextStreak = streak.last_activity_date === yesterday ? streak.current_streak + 1 : 1;
    await db
      .prepare(
        "UPDATE user_streaks SET current_streak = ?, longest_streak = MAX(longest_streak, ?), last_activity_date = ?, updated_at = ? WHERE user_id = ?"
      )
      .bind(nextStreak, nextStreak, today, now, input.userId)
      .run();
  }

  await checkUserAchievements(env, input.userId);

  return { id, quiz_id: input.quizId, user_id: input.userId, quiz_type: input.quizType, result_type: input.resultType, result_value: input.resultValue, xp_gained: input.xpGained, created_at: now };
}

type AchievementRow = { id: string; criteria_type: string; criteria_value: number; xp_reward: number };

export async function checkUserAchievements(env: Env["Bindings"], userId: string) {
  const db = getDb(env);
  const profile = await db.prepare("SELECT xp FROM profiles WHERE id = ?").bind(userId).first<{ xp: number }>();
  const streak = await db.prepare("SELECT current_streak FROM user_streaks WHERE user_id = ?").bind(userId).first<{ current_streak: number }>();
  const quizCount = await db.prepare("SELECT count(*) as n FROM quiz_results WHERE user_id = ?").bind(userId).first<{ n: number }>();
  const quizCreated = await db.prepare("SELECT count(*) as n FROM quizzes WHERE author_id = ?").bind(userId).first<{ n: number }>();
  const likesReceived = await db
    .prepare("SELECT COALESCE(SUM(likes_count), 0) as n FROM quizzes WHERE author_id = ?")
    .bind(userId)
    .first<{ n: number }>();

  const stats: Record<string, number> = {
    quiz_count: quizCount?.n ?? 0,
    xp: profile?.xp ?? 0,
    streak: streak?.current_streak ?? 0,
    quiz_created: quizCreated?.n ?? 0,
    likes_received: likesReceived?.n ?? 0,
  };

  const { results: achievements } = await db.prepare("SELECT id, criteria_type, criteria_value, xp_reward FROM achievements").all<AchievementRow>();
  const { results: earned } = await db.prepare("SELECT achievement_id FROM user_achievements WHERE user_id = ?").bind(userId).all<{ achievement_id: string }>();
  const earnedIds = new Set(earned.map((e) => e.achievement_id));

  for (const a of achievements) {
    if (earnedIds.has(a.id)) continue;
    const current = stats[a.criteria_type];
    if (current !== undefined && current >= a.criteria_value) {
      await db
        .prepare("INSERT INTO user_achievements (user_id, achievement_id, earned_at) VALUES (?, ?, ?)")
        .bind(userId, a.id, nowIso())
        .run();
      if (a.xp_reward > 0) {
        await db.prepare("UPDATE profiles SET xp = xp + ? WHERE id = ?").bind(a.xp_reward, userId).run();
      }
    }
  }
}

export async function checkCreatorAchievements(env: Env["Bindings"], authorId: string) {
  await checkUserAchievements(env, authorId);
}

// ─── Leaderboard windows ────────────────────────────────────────────────────
// Ported from get_leaderboard_window()/get_my_leaderboard_rank() (008_leaderboard_windows.sql).

function windowStartIso(window: string) {
  const now = new Date();
  if (window === "weekly") {
    const day = (now.getUTCDay() + 6) % 7; // Monday = 0
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
    return start.toISOString();
  }
  if (window === "monthly") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  }
  return null;
}

export type LeaderboardEntry = { user_id: string; xp: number; handle: string; display_name: string; avatar_url: string | null; level: number };

export async function getLeaderboardWindow(env: Env["Bindings"], window: string, limit: number, offset: number): Promise<LeaderboardEntry[]> {
  const db = getDb(env);
  if (window === "weekly" || window === "monthly") {
    const since = windowStartIso(window)!;
    const { results } = await db
      .prepare(
        `SELECT qr.user_id as user_id, SUM(qr.xp_gained) as xp, p.handle as handle, p.display_name as display_name, p.avatar_url as avatar_url, p.level as level
         FROM quiz_results qr JOIN profiles p ON p.id = qr.user_id
         WHERE qr.user_id IS NOT NULL AND qr.created_at >= ?
         GROUP BY qr.user_id, p.handle, p.display_name, p.avatar_url, p.level
         ORDER BY xp DESC LIMIT ? OFFSET ?`
      )
      .bind(since, limit, offset)
      .all<LeaderboardEntry>();
    return results;
  }
  const { results } = await db
    .prepare(
      `SELECT l.user_id as user_id, l.xp_all_time as xp, p.handle as handle, p.display_name as display_name, p.avatar_url as avatar_url, p.level as level
       FROM leaderboard l JOIN profiles p ON p.id = l.user_id
       ORDER BY l.xp_all_time DESC LIMIT ? OFFSET ?`
    )
    .bind(limit, offset)
    .all<LeaderboardEntry>();
  return results;
}

export async function getMyLeaderboardRank(env: Env["Bindings"], userId: string, window: string) {
  const db = getDb(env);
  if (window === "weekly" || window === "monthly") {
    const since = windowStartIso(window)!;
    const { results } = await db
      .prepare(
        `SELECT user_id, SUM(xp_gained) as xp FROM quiz_results WHERE user_id IS NOT NULL AND created_at >= ? GROUP BY user_id ORDER BY xp DESC`
      )
      .bind(since)
      .all<{ user_id: string; xp: number }>();
    const rank = results.findIndex((r) => r.user_id === userId);
    if (rank === -1) return null;
    const profile = await getProfileById(env, userId);
    return { rank: rank + 1, xp: results[rank].xp, handle: profile?.handle, display_name: profile?.display_name, avatar_url: profile?.avatar_url, level: profile?.level };
  }
  const { results } = await db.prepare("SELECT user_id, xp_all_time as xp FROM leaderboard ORDER BY xp_all_time DESC").all<{ user_id: string; xp: number }>();
  const rank = results.findIndex((r) => r.user_id === userId);
  if (rank === -1) return null;
  const profile = await getProfileById(env, userId);
  return { rank: rank + 1, xp: results[rank].xp, handle: profile?.handle, display_name: profile?.display_name, avatar_url: profile?.avatar_url, level: profile?.level };
}

// ─── Comments ───────────────────────────────────────────────────────────────

export async function listQuizComments(env: Env["Bindings"], quizId: string, limit: number, offset: number) {
  const db = getDb(env);
  const { results } = await db
    .prepare(
      `SELECT c.id, c.content, c.created_at, c.updated_at, p.id as user_id, p.handle, p.display_name, p.avatar_url
       FROM quiz_comments c JOIN profiles p ON p.id = c.user_id
       WHERE c.quiz_id = ? AND c.hidden = 0 AND c.deleted_at IS NULL
       ORDER BY c.created_at DESC LIMIT ? OFFSET ?`
    )
    .bind(quizId, limit, offset)
    .all<{ id: string; content: string; created_at: string; updated_at: string; user_id: string; handle: string; display_name: string; avatar_url: string | null }>();
  const countRow = await db
    .prepare("SELECT count(*) as n FROM quiz_comments WHERE quiz_id = ? AND hidden = 0 AND deleted_at IS NULL")
    .bind(quizId)
    .first<{ n: number }>();

  const data = results.map((r) => ({
    id: r.id,
    content: r.content,
    created_at: r.created_at,
    updated_at: r.updated_at,
    user: { id: r.user_id, handle: r.handle, display_name: r.display_name, avatar_url: r.avatar_url },
  }));
  return { data, total: countRow?.n ?? 0 };
}

export async function createQuizComment(env: Env["Bindings"], quizId: string, userId: string, content: string) {
  const db = getDb(env);
  const id = newId();
  const now = nowIso();
  await db
    .prepare("INSERT INTO quiz_comments (id, quiz_id, user_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, quizId, userId, content, now, now)
    .run();
  const profile = await getProfileById(env, userId);
  return {
    id,
    content,
    created_at: now,
    updated_at: now,
    user: { id: userId, handle: profile?.handle, display_name: profile?.display_name, avatar_url: profile?.avatar_url },
  };
}

export async function getCommentOwner(env: Env["Bindings"], commentId: string) {
  const row = await getDb(env).prepare("SELECT user_id FROM quiz_comments WHERE id = ?").bind(commentId).first<{ user_id: string }>();
  return row?.user_id ?? null;
}

export async function deleteComment(env: Env["Bindings"], commentId: string) {
  await getDb(env).prepare("DELETE FROM quiz_comments WHERE id = ?").bind(commentId).run();
}

export async function hideComment(env: Env["Bindings"], commentId: string) {
  await getDb(env).prepare("UPDATE quiz_comments SET hidden = 1 WHERE id = ?").bind(commentId).run();
  await resolveOpenReports(env, "comment", commentId, "hidden");
}

// ─── Content reports ────────────────────────────────────────────────────────

export async function createReport(env: Env["Bindings"], targetType: "comment" | "quiz", targetId: string, reporterId: string, reason: string | null) {
  const db = getDb(env);
  const existing = await db
    .prepare("SELECT id FROM content_reports WHERE target_type = ? AND target_id = ? AND reporter_id = ? AND resolved_at IS NULL")
    .bind(targetType, targetId, reporterId)
    .first();
  if (existing) return; // duplicate open report — treat as success
  await db
    .prepare("INSERT INTO content_reports (id, target_type, target_id, reporter_id, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(newId(), targetType, targetId, reporterId, reason, nowIso())
    .run();
}

export async function resolveOpenReports(env: Env["Bindings"], targetType: "comment" | "quiz", targetId: string, action: string) {
  await getDb(env)
    .prepare("UPDATE content_reports SET resolved_at = ?, resolved_action = ? WHERE target_type = ? AND target_id = ? AND resolved_at IS NULL")
    .bind(nowIso(), action, targetType, targetId)
    .run();
}

export async function listUnresolvedReports(env: Env["Bindings"], limit: number) {
  const db = getDb(env);
  const { results: reports } = await db
    .prepare(
      `SELECT r.id, r.target_type, r.target_id, r.reason, r.created_at, p.handle, p.display_name
       FROM content_reports r LEFT JOIN profiles p ON p.id = r.reporter_id
       WHERE r.resolved_at IS NULL ORDER BY r.created_at DESC LIMIT ?`
    )
    .bind(limit)
    .all<{ id: string; target_type: string; target_id: string; reason: string | null; created_at: string; handle: string | null; display_name: string | null }>();

  const commentIds = reports.filter((r) => r.target_type === "comment").map((r) => r.target_id);
  const quizIds = reports.filter((r) => r.target_type === "quiz").map((r) => r.target_id);

  const commentsById = new Map<string, unknown>();
  if (commentIds.length) {
    const placeholders = commentIds.map(() => "?").join(", ");
    const { results } = await db
      .prepare(`SELECT id, content, quiz_id, hidden, deleted_at FROM quiz_comments WHERE id IN (${placeholders})`)
      .bind(...commentIds)
      .all<{ id: string }>();
    for (const row of results) commentsById.set(row.id, row);
  }

  const quizzesById = new Map<string, unknown>();
  if (quizIds.length) {
    const placeholders = quizIds.map(() => "?").join(", ");
    const { results } = await db
      .prepare(`SELECT id, title, slug, status FROM quizzes WHERE id IN (${placeholders})`)
      .bind(...quizIds)
      .all<{ id: string }>();
    for (const row of results) quizzesById.set(row.id, row);
  }

  return reports.map((r) => ({
    id: r.id,
    target_type: r.target_type,
    target_id: r.target_id,
    reason: r.reason,
    created_at: r.created_at,
    reporter: { handle: r.handle, display_name: r.display_name },
    target: r.target_type === "comment" ? commentsById.get(r.target_id) ?? null : quizzesById.get(r.target_id) ?? null,
  }));
}

// ─── Achievements (public listing) ─────────────────────────────────────────

export async function getUserAchievements(env: Env["Bindings"], userId: string) {
  const db = getDb(env);
  const { results: earned } = await db.prepare("SELECT achievement_id, earned_at FROM user_achievements WHERE user_id = ?").bind(userId).all<{ achievement_id: string; earned_at: string }>();
  const { results: all } = await db
    .prepare("SELECT id, slug, icon, criteria_type, criteria_value, xp_reward, created_at FROM achievements ORDER BY criteria_type, criteria_value")
    .all<{ id: string }>();

  const earnedMap = new Map(earned.map((e) => [e.achievement_id, e.earned_at]));
  return all.map((a) => ({ ...a, earned: earnedMap.has(a.id), earned_at: earnedMap.get(a.id) ?? null }));
}

// ─── User activity ──────────────────────────────────────────────────────────

export async function getUserCreatedQuizzes(env: Env["Bindings"], userId: string, limit: number) {
  const { results } = await getDb(env)
    .prepare(
      `SELECT id, slug, title, description, cover_url, type, likes_count, attempts_count, created_at
       FROM quizzes WHERE author_id = ? ORDER BY created_at DESC LIMIT ?`
    )
    .bind(userId, limit)
    .all();
  return results;
}

export async function getUserPlayedQuizzes(env: Env["Bindings"], userId: string, resultLimit: number, quizLimit: number) {
  const db = getDb(env);
  const { results } = await db
    .prepare(
      `SELECT qr.quiz_id, qr.created_at, q.id as q_id, q.slug, q.title, q.description, q.cover_url, q.type, q.likes_count, q.attempts_count
       FROM quiz_results qr JOIN quizzes q ON q.id = qr.quiz_id
       WHERE qr.user_id = ? ORDER BY qr.created_at DESC LIMIT ?`
    )
    .bind(userId, resultLimit)
    .all<{ quiz_id: string; q_id: string; slug: string; title: string; description: string | null; cover_url: string | null; type: string; likes_count: number; attempts_count: number }>();

  const seen = new Set<string>();
  const played: unknown[] = [];
  for (const row of results) {
    if (seen.has(row.q_id)) continue;
    seen.add(row.q_id);
    played.push({
      id: row.q_id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      cover_url: row.cover_url,
      type: row.type,
      likes_count: row.likes_count,
      attempts_count: row.attempts_count,
    });
    if (played.length >= quizLimit) break;
  }
  return played;
}
