// Shared pieces of the slice 4 rewrite: the review gate and the D1 access.
// See docs/plans/adsense-low-value-content/slice-04-rewrite-pipeline-first-batch.md.

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const API_DIR = join(ROOT, "apps/api");

export const MIN_OUTCOME_WORDS = 150;
export const MAX_OUTCOME_WORDS = 350;
export const MIN_QUESTIONS = 8;
export const MIN_INTRO_WORDS = 25;
const INTRO_KEYS = ["context", "what_youll_learn", "how_scoring_works"];

export const words = (text) => String(text ?? "").trim().split(/\s+/).filter(Boolean).length;

/** Every reason a draft may not be written. An empty list is the only pass. */
export function gate(draft) {
  const errors = [];
  const fail = (msg) => errors.push(msg);

  if (draft.reviewed !== true) fail("reviewed is not true: the owner has not signed this draft off");
  if (!draft.slug) fail("no slug");
  if (!String(draft.title ?? "").trim()) fail("no title");
  if (!String(draft.description ?? "").trim()) fail("no description");

  for (const key of INTRO_KEYS) {
    const n = words(draft.intro_content?.[key]);
    if (n < MIN_INTRO_WORDS) fail(`intro_content.${key} has ${n} words (min ${MIN_INTRO_WORDS})`);
  }

  const outcomes = draft.outcomes ?? [];
  const keys = new Set(outcomes.map((o) => o.key));
  if (outcomes.length < 2) fail(`${outcomes.length} outcomes (min 2)`);
  if (keys.size !== outcomes.length) fail("outcome keys are not unique");
  for (const o of outcomes) {
    const n = words(o.description);
    if (!String(o.title ?? "").trim()) fail(`outcome ${o.key} has no title`);
    if (n < MIN_OUTCOME_WORDS || n > MAX_OUTCOME_WORDS) {
      fail(`outcome ${o.key} has ${n} words (${MIN_OUTCOME_WORDS}-${MAX_OUTCOME_WORDS})`);
    }
  }

  const questions = draft.questions ?? [];
  if (questions.length < MIN_QUESTIONS) fail(`${questions.length} questions (min ${MIN_QUESTIONS})`);
  const reach = Object.fromEntries([...keys].map((k) => [k, 0]));
  for (const q of questions) {
    if (!String(q.title ?? "").trim()) fail(`question ${q.id} has no title`);
    const answers = q.answers ?? [];
    if (answers.length < 3) fail(`question ${q.id} has ${answers.length} answers (min 3)`);
    for (const a of answers) {
      if (!String(a.label ?? "").trim()) fail(`answer ${q.id}/${a.id} has no label`);
      const weights = Object.keys(a.outcomeWeights ?? {});
      if (weights.length === 0) fail(`answer ${q.id}/${a.id} points to no outcome`);
      for (const k of weights) {
        if (!keys.has(k)) fail(`answer ${q.id}/${a.id} points to unknown outcome ${k}`);
        else reach[k] += 1;
      }
    }
  }
  for (const [k, n] of Object.entries(reach)) {
    if (n < 3) fail(`outcome ${k} is reachable from ${n} answers (min 3)`);
  }

  // No image or link of any kind: the rewritten core carries no third-party media.
  if (/https?:\/\//.test(JSON.stringify({ ...draft, slug: "" }))) fail("draft contains a URL");

  return errors;
}

/** The content JSON QuizPlay reads: questions[].answers[].outcomeWeights and outcomes[]. */
export function toContent(draft) {
  return {
    questions: draft.questions.map((q) => ({
      id: q.id,
      title: q.title.trim(),
      answers: q.answers.map((a) => ({ id: a.id, label: a.label.trim(), outcomeWeights: a.outcomeWeights })),
    })),
    outcomes: draft.outcomes.map((o) => ({ key: o.key, title: o.title.trim(), description: o.description.trim() })),
  };
}

export const sqlString = (value) => `'${String(value).replace(/'/g, "''")}'`;

function targetArgs(target) {
  if (target === "remote") return ["--remote"];
  if (target === "local") return ["--local", "--persist-to", ".wrangler/prod-copy"];
  throw new Error(`target must be local or remote, got ${target}`);
}

export function query(target, sql) {
  const p = spawnSync(
    "npx",
    ["--no-install", "wrangler", "d1", "execute", "funsona-db", ...targetArgs(target), "--json", "--command", sql],
    { cwd: API_DIR, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (p.status !== 0) throw new Error(`wrangler query failed:\n${p.stderr || p.stdout}`);
  return JSON.parse(p.stdout)[0].results;
}

export function executeFile(target, sql) {
  const file = join(mkdtempSync(join(tmpdir(), "funsona-rewrite-")), "apply.sql");
  writeFileSync(file, sql);
  const p = spawnSync(
    "npx",
    ["--no-install", "wrangler", "d1", "execute", "funsona-db", ...targetArgs(target), "--file", file, "--yes", "--json"],
    { cwd: API_DIR, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (p.status !== 0) throw new Error(`wrangler execute failed:\n${p.stderr || p.stdout}`);
  return p.stdout;
}
