import Database from "better-sqlite3";
import path from "path";

export interface ImageSettings {
  width?: number;
  height?: number;
  steps?: number;
  cfg_scale?: number;
  sampler?: string;
  seed?: number;
}

export interface ImageQueueItem {
  id: string;
  quiz_id: string;
  item_type: "banner" | "question" | "outcome"; // banner, question_P1, outcome_resultado1
  item_id: string; // question_id ou outcome_key
  prompt: string;
  negative_prompt: string | null;
  visual_style: string | null;
  width: number;
  height: number;
  steps: number;
  cfg_scale: number;
  sampler: string;
  status: "pending" | "generating" | "done" | "failed";
  attempt: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  local_path: string | null; // refactored-quizzes/{quiz_id}/...
}

// Default negative prompt — blocks sexualized/inappropriate content whenever
// ChatGPT's image_plan does not supply one specific to the item. The prompt text
// itself stays as written, because it is fed to the image model.
export const DEFAULT_NEGATIVE_PROMPT =
  "text, words, letters, logo, watermark, signature, low quality, blurry, jpeg artifacts, " +
  "deformed, bad anatomy, extra fingers, extra limbs, missing fingers, distorted face, cropped head, " +
  "nsfw, nude, nudity, lingerie, bikini, swimsuit, cleavage, see-through clothing, suggestive pose, " +
  "erotic, fetish, childlike, loli, young-looking, schoolgirl, underage, body focus, breasts focus, butt focus";

export function getImageQueueDb(): Database.Database {
  const dbPath = path.join(process.cwd(), "image-queue.db");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS image_queue (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      prompt TEXT NOT NULL,
      negative_prompt TEXT,
      visual_style TEXT,
      width INTEGER NOT NULL DEFAULT 1024,
      height INTEGER NOT NULL DEFAULT 1024,
      steps INTEGER NOT NULL DEFAULT 20,
      cfg_scale REAL NOT NULL DEFAULT 6.5,
      sampler TEXT NOT NULL DEFAULT 'DPM++ 2M Karras',
      status TEXT DEFAULT 'pending',
      attempt INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      error TEXT,
      local_path TEXT,
      UNIQUE(quiz_id, item_type, item_id)
    );
    CREATE INDEX IF NOT EXISTS idx_status ON image_queue(status);
    CREATE INDEX IF NOT EXISTS idx_quiz ON image_queue(quiz_id);
  `);

  // Light migration, for DBs created before these columns existed
  const cols = db.prepare("PRAGMA table_info(image_queue)").all() as Array<{ name: string }>;
  const colNames = new Set(cols.map((c) => c.name));
  const migrations: Array<[string, string]> = [
    ["negative_prompt", "TEXT"],
    ["visual_style", "TEXT"],
    ["width", "INTEGER NOT NULL DEFAULT 1024"],
    ["height", "INTEGER NOT NULL DEFAULT 1024"],
    ["steps", "INTEGER NOT NULL DEFAULT 20"],
    ["cfg_scale", "REAL NOT NULL DEFAULT 6.5"],
    ["sampler", "TEXT NOT NULL DEFAULT 'DPM++ 2M Karras'"],
  ];
  for (const [name, def] of migrations) {
    if (!colNames.has(name)) {
      db.exec(`ALTER TABLE image_queue ADD COLUMN ${name} ${def}`);
    }
  }

  return db;
}

export function enqueueImage(
  db: Database.Database,
  quizId: string,
  itemType: string,
  itemId: string,
  prompt: string,
  opts?: {
    negativePrompt?: string;
    visualStyle?: string;
    settings?: ImageSettings;
  }
): void {
  const id = `img_${quizId}_${itemType}_${itemId}`;
  const s = opts?.settings ?? {};
  db.prepare(`
    INSERT OR IGNORE INTO image_queue
      (id, quiz_id, item_type, item_id, prompt, negative_prompt, visual_style,
       width, height, steps, cfg_scale, sampler, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, quizId, itemType, itemId, prompt,
    opts?.negativePrompt ?? DEFAULT_NEGATIVE_PROMPT,
    opts?.visualStyle ?? null,
    s.width ?? 1024,
    s.height ?? 1024,
    s.steps ?? 20,
    s.cfg_scale ?? 6.5,
    s.sampler ?? "DPM++ 2M Karras",
    new Date().toISOString()
  );
}

export function getPendingImages(db: Database.Database, limit = 10): ImageQueueItem[] {
  return db.prepare(`
    SELECT * FROM image_queue
    WHERE status = 'pending' OR (status = 'failed' AND attempt < 3)
    ORDER BY created_at ASC
    LIMIT ?
  `).all(limit) as ImageQueueItem[];
}

export function updateImageStatus(
  db: Database.Database,
  id: string,
  status: string,
  data?: { local_path?: string; error?: string }
): void {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE image_queue
    SET status = ?, started_at = COALESCE(started_at, ?), completed_at = ?,
        local_path = COALESCE(local_path, ?), error = ?, attempt = attempt + 1
    WHERE id = ?
  `).run(
    status,
    status === "generating" ? now : null,
    status === "done" || status === "failed" ? now : null,
    data?.local_path || null,
    data?.error || null,
    id
  );
}

export function getQueueStats(db: Database.Database) {
  const stats = db.prepare(`
    SELECT status, COUNT(*) as cnt FROM image_queue GROUP BY status
  `).all() as Array<{ status: string; cnt: number }>;
  return Object.fromEntries(stats.map((s) => [s.status, s.cnt]));
}
