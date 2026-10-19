// Measure the curated core against the slice 4 bar, straight from D1.
//
// Per quiz: share of outcomes inside the word range, whether intro_content has all three keys,
// third-party image URLs left in content or cover, and whether content differs from a baseline
// export (proof the write happened). Prints one line per quiz and a summary.
//
// Usage: node scripts/adsense-core/rewrite/report.mjs --target local|remote [--baseline <restored.sqlite>] [slug ...]
//   With no slugs, reports every curated, published quiz.

import { spawnSync } from "node:child_process";
import { MAX_OUTCOME_WORDS, MIN_INTRO_WORDS, MIN_OUTCOME_WORDS, query, sqlString, words } from "./lib.mjs";

const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const target = opt("--target");
const baseline = opt("--baseline");
const slugs = args.filter((a, i) => !a.startsWith("--") && !["--target", "--baseline"].includes(args[i - 1]));

const where = slugs.length
  ? `slug IN (${slugs.map(sqlString).join(",")})`
  : "status = 'PUBLISHED' AND ads_eligible = 1";
const rows = query(target, `SELECT slug, content, intro_content, cover_url FROM quizzes WHERE ${where} ORDER BY slug`);

function baselineContent(slug) {
  if (!baseline) return undefined;
  const p = spawnSync("sqlite3", [baseline, `SELECT content FROM quizzes WHERE slug = ${sqlString(slug)}`], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  return p.stdout.trim();
}

const thirdParty = (url) => typeof url === "string" && /^https?:\/\//.test(url) && !url.startsWith("https://api.funsona.com/");

let pass = 0;
for (const r of rows) {
  const content = JSON.parse(r.content);
  // intro_content can be SQL NULL or the JSON text "null"; both mean no intro.
  const intro = (r.intro_content && JSON.parse(r.intro_content)) || {};
  const outcomes = content.outcomes ?? [];
  const inRange = outcomes.filter((o) => {
    const n = words(o.description);
    return n >= MIN_OUTCOME_WORDS && n <= MAX_OUTCOME_WORDS;
  }).length;
  const introOk = ["context", "what_youll_learn", "how_scoring_works"].every((k) => words(intro[k]) >= MIN_INTRO_WORDS);
  const media = [r.cover_url, ...outcomes.map((o) => o.imageUrl || o.image_url || o.image)];
  for (const q of content.questions ?? []) {
    media.push(q.imageUrl || q.image_url);
    for (const a of q.answers ?? q.options ?? []) media.push(a.imageUrl || a.image_url);
  }
  const foreign = media.filter(thirdParty).length;
  const base = baselineContent(r.slug);
  const changed = base === undefined ? "n/a" : base !== r.content ? "yes" : "NO";
  const ok = inRange === outcomes.length && outcomes.length > 0 && introOk && foreign === 0 && changed !== "NO";
  if (ok) pass += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${r.slug}  outcomes ${inRange}/${outcomes.length} in range  intro ${introOk ? "ok" : "MISSING"}  third-party media ${foreign}  changed ${changed}`);
}
console.log(`---- ${pass} of ${rows.length} quizzes meet the bar`);
process.exit(pass === rows.length ? 0 : 1);
