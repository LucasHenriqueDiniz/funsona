// Write owner-reviewed quiz rewrites to D1. Slice 4 of docs/plans/adsense-low-value-content.
//
// Refuses the whole run if any draft fails the gate in lib.mjs. The first gate is
// `reviewed: true`, which only the owner sets after reading and editing the draft, so nothing
// machine-written reaches the database unread. Only curated, published quizzes can be written.
// Third-party covers are cleared; covers on api.funsona.com are kept (their origin is an open
// question in docs/research/2026-10-18-catalogue-origin).
//
// Usage: node scripts/adsense-core/rewrite/apply.mjs --target local|remote <draft.json> [...]

import { readFileSync } from "node:fs";
import { executeFile, gate, query, sqlString, toContent } from "./lib.mjs";

const args = process.argv.slice(2);
const target = args[args.indexOf("--target") + 1];
const files = args.filter((a, i) => a !== "--target" && args[i - 1] !== "--target");
if (!["local", "remote"].includes(target) || files.length === 0) {
  console.error("usage: apply.mjs --target local|remote <draft.json> [...]");
  process.exit(2);
}

const drafts = files.map((f) => ({ file: f, draft: JSON.parse(readFileSync(f, "utf8")) }));

let refused = 0;
for (const { file, draft } of drafts) {
  const errors = gate(draft);
  if (errors.length) {
    refused += 1;
    console.error(`REFUSED ${file}`);
    for (const e of errors) console.error(`  - ${e}`);
  }
}
if (refused) {
  console.error(`${refused} of ${drafts.length} draft(s) refused. Nothing was written.`);
  process.exit(1);
}

const slugs = drafts.map(({ draft }) => draft.slug);
const eligible = new Set(
  query(target, `SELECT slug FROM quizzes WHERE status = 'PUBLISHED' AND ads_eligible = 1 AND slug IN (${slugs.map(sqlString).join(",")})`)
    .map((r) => r.slug),
);
const notEligible = slugs.filter((s) => !eligible.has(s));
if (notEligible.length) {
  console.error(`Not curated or not published on ${target}: ${notEligible.join(", ")}. Nothing was written.`);
  process.exit(1);
}

const statements = drafts.map(({ draft }) => `UPDATE quizzes SET
  title = ${sqlString(draft.title.trim())},
  description = ${sqlString(draft.description.trim())},
  content = ${sqlString(JSON.stringify(toContent(draft)))},
  intro_content = ${sqlString(JSON.stringify(draft.intro_content))},
  cover_url = CASE WHEN cover_url LIKE 'https://api.funsona.com/%' THEN cover_url ELSE NULL END,
  updated_at = STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE slug = ${sqlString(draft.slug)} AND status = 'PUBLISHED' AND ads_eligible = 1;`);

// One statement per call: D1 rejects a file holding several of these at once
// (SQLITE_TOOBIG), while each alone is well inside the limit.
for (const [i, statement] of statements.entries()) {
  executeFile(target, statement);
  console.log(`wrote ${slugs[i]} to ${target}`);
}
console.log(`---- ${drafts.length} quiz(zes) written to ${target}`);
