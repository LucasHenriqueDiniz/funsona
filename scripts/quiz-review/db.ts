import Database, { type Database as DB } from "better-sqlite3";
import path from "path";

export const DB_PATH = path.join(process.cwd(), "quiz-review.db");

// ─── Status lifecycle ─────────────────────────────────────────────────────────
// pending → reviewed → applied
//                ↘ needs_refactor → refactored → applied
//                                              → image_queued → image_done
export type QuizStatus =
  | "pending"        // nunca processado
  | "reviewed"       // ChatGPT revisou, JSON salvo localmente
  | "applied"        // salvo no Supabase
  | "needs_refactor" // score <= REFACTOR_THRESHOLD, na fila para ser refeito
  | "refactored"     // revisado novamente após flag
  | "image_queued"   // precisa de imagem de capa
  | "image_done"     // imagem gerada e salva
  | "skip"           // ignorado manualmente
  | "error";         // erro durante processamento

export type BatchStatus = "pending" | "exported" | "reviewed" | "applied" | "error";

export interface QuizRow {
  id: string;
  original_title: string | null;
  new_title: string | null;
  score: number | null;
  status: QuizStatus;
  batch_num: number | null;
  needs_refactor: 0 | 1;
  recommended_unpublish: 0 | 1;
  issues_count: number;
  review_json: string | null;
  image_url: string | null;
  applied_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface BatchRow {
  num: number;
  status: BatchStatus;
  quiz_count: number;
  md_file: string | null;
  reviewed_file: string | null;
  chatgpt_url: string | null;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
}

// ─── Open / migrate ───────────────────────────────────────────────────────────

let _db: DB | null = null;

export function getDb(): DB {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  _db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_reviews (
      id                    TEXT    PRIMARY KEY,
      original_title        TEXT,
      new_title             TEXT,
      score                 INTEGER,
      status                TEXT    NOT NULL DEFAULT 'pending',
      batch_num             INTEGER,
      needs_refactor        INTEGER NOT NULL DEFAULT 0,
      recommended_unpublish INTEGER NOT NULL DEFAULT 0,
      issues_count          INTEGER NOT NULL DEFAULT 0,
      review_json           TEXT,
      image_url             TEXT,
      applied_at            TEXT,
      error                 TEXT,
      created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at            TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS batches (
      num           INTEGER PRIMARY KEY,
      status        TEXT    NOT NULL DEFAULT 'pending',
      quiz_count    INTEGER NOT NULL DEFAULT 0,
      md_file       TEXT,
      reviewed_file TEXT,
      chatgpt_url   TEXT,
      started_at    TEXT,
      completed_at  TEXT,
      error         TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_qr_status    ON quiz_reviews(status);
    CREATE INDEX IF NOT EXISTS idx_qr_batch     ON quiz_reviews(batch_num);
    CREATE INDEX IF NOT EXISTS idx_qr_refactor  ON quiz_reviews(needs_refactor);
    CREATE INDEX IF NOT EXISTS idx_qr_unpublish ON quiz_reviews(recommended_unpublish);
  `);

  return _db;
}

// ─── Quiz helpers ─────────────────────────────────────────────────────────────

export function upsertQuiz(db: DB, id: string, data: Partial<Omit<QuizRow, "id" | "created_at" | "updated_at">>) {
  const keys = Object.keys(data);
  if (!keys.length) return;

  const cols   = keys.join(", ");
  const vals   = keys.map((k) => `@${k}`).join(", ");
  const upd    = keys.map((k) => `${k} = @${k}`).join(", ");

  db.prepare(`
    INSERT INTO quiz_reviews (id, ${cols}, updated_at)
    VALUES (@id, ${vals}, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET ${upd}, updated_at = datetime('now')
  `).run({ id, ...data });
}

export function getQuiz(db: DB, id: string): QuizRow | null {
  return (db.prepare("SELECT * FROM quiz_reviews WHERE id = ?").get(id) as QuizRow) ?? null;
}

export function getQuizStatus(db: DB, id: string): QuizStatus | null {
  const row = db.prepare("SELECT status FROM quiz_reviews WHERE id = ?").get(id) as { status: QuizStatus } | undefined;
  return row?.status ?? null;
}

export function getRefactorQueue(db: DB): QuizRow[] {
  return db.prepare(
    "SELECT * FROM quiz_reviews WHERE needs_refactor = 1 AND status NOT IN ('refactored', 'applied', 'skip') ORDER BY score ASC"
  ).all() as QuizRow[];
}

export function getImageQueue(db: DB): QuizRow[] {
  return db.prepare(
    "SELECT * FROM quiz_reviews WHERE status IN ('applied', 'refactored') AND image_url IS NULL AND review_json IS NOT NULL ORDER BY score DESC"
  ).all() as QuizRow[];
}

export function getStats(db: DB) {
  const total     = (db.prepare("SELECT COUNT(*) as c FROM quiz_reviews").get() as any).c as number;
  const applied   = (db.prepare("SELECT COUNT(*) as c FROM quiz_reviews WHERE status = 'applied'").get() as any).c as number;
  const byStatus  = db.prepare("SELECT status, COUNT(*) as c FROM quiz_reviews GROUP BY status ORDER BY c DESC").all() as Array<{ status: string; c: number }>;
  const refactor  = (db.prepare("SELECT COUNT(*) as c FROM quiz_reviews WHERE needs_refactor = 1").get() as any).c as number;
  const unpublish = (db.prepare("SELECT COUNT(*) as c FROM quiz_reviews WHERE recommended_unpublish = 1").get() as any).c as number;
  const avgScore  = Math.round(((db.prepare("SELECT AVG(score) as a FROM quiz_reviews WHERE score IS NOT NULL").get() as any).a ?? 0) * 10) / 10;
  const lowScore  = db.prepare("SELECT id, original_title, score FROM quiz_reviews WHERE score <= 4 ORDER BY score ASC LIMIT 10").all() as Array<{ id: string; original_title: string; score: number }>;
  return { total, applied, byStatus, refactor, unpublish, avgScore, lowScore };
}

// ─── Batch helpers ────────────────────────────────────────────────────────────

export function upsertBatch(db: DB, num: number, data: Partial<Omit<BatchRow, "num">>) {
  const keys = Object.keys(data);
  if (!keys.length) return;

  const cols = keys.join(", ");
  const vals = keys.map((k) => `@${k}`).join(", ");
  const upd  = keys.map((k) => `${k} = @${k}`).join(", ");

  db.prepare(`
    INSERT INTO batches (num, ${cols})
    VALUES (@num, ${vals})
    ON CONFLICT(num) DO UPDATE SET ${upd}
  `).run({ num, ...data });
}

export function getBatch(db: DB, num: number): BatchRow | null {
  return (db.prepare("SELECT * FROM batches WHERE num = ?").get(num) as BatchRow) ?? null;
}
