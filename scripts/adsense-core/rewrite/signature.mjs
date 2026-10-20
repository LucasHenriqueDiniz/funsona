// Measure the template signature of rewrite drafts. Slice 5 of docs/plans/adsense-low-value-content.
//
// Every outcome of a quiz shows on the same page, so a sentence shape repeated across outcomes
// reads as a form. Two measures:
// - openers: the first two words of each outcome's second and last paragraphs, repeated inside
//   one quiz (the first paragraph names the result, so it is expected to repeat);
// - overlap: 5-gram Jaccard between outcomes of different quizzes, over every pair that touches a
//   draft in <drafts-dir>. Drafts in --against are compared with those, not with each other.
//
// Usage: node scripts/adsense-core/rewrite/signature.mjs <drafts-dir> [--against <older-drafts-dir>]

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const against = args.includes("--against") ? args[args.indexOf("--against") + 1] : undefined;
const dir = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--against");
if (!dir) {
  console.error("usage: signature.mjs <drafts-dir> [--against <older-drafts-dir>]");
  process.exit(2);
}

const load = (d) => readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(d, f), "utf8")));
const tokens = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
const paragraphs = (outcome) => outcome.description.trim().split(/\n\s*\n/);
const opener = (paragraph) => tokens(paragraph ?? "").slice(0, 2).join(" ");

function fiveGrams(text) {
  const words = tokens(text);
  const grams = new Set();
  for (let i = 0; i + 5 <= words.length; i++) grams.add(words.slice(i, i + 5).join(" "));
  return grams;
}

function jaccard(a, b) {
  let shared = 0;
  for (const g of a) if (b.has(g)) shared += 1;
  return shared / (a.size + b.size - shared || 1);
}

const drafts = load(dir);
const older = against ? load(against) : [];

let outcomes = 0;
let repeated = 0;
for (const d of drafts) {
  outcomes += d.outcomes.length;
  for (const [label, pick] of [["second", (ps) => ps[1]], ["last", (ps) => ps[ps.length - 1]]]) {
    const counts = {};
    for (const o of d.outcomes) {
      const key = opener(pick(paragraphs(o)));
      counts[key] = (counts[key] ?? 0) + 1;
    }
    for (const [key, n] of Object.entries(counts)) {
      if (n < 2) continue;
      repeated += n;
      console.log(`  ${d.slug}: ${label} paragraph opens with "${key}" ${n} times`);
    }
  }
}
console.log(`openers: ${repeated} of ${outcomes} outcomes share a second- or last-paragraph opener inside their quiz`);

const units = [...drafts.map((d) => ({ d, isNew: true })), ...older.map((d) => ({ d, isNew: false }))]
  .flatMap(({ d, isNew }) => d.outcomes.map((o) => ({ id: `${d.slug}/${o.key}`, slug: d.slug, grams: fiveGrams(o.description), isNew })));
let pairs = 0;
let sum = 0;
let max = { value: 0, between: "none" };
for (let i = 0; i < units.length; i++) {
  for (let j = i + 1; j < units.length; j++) {
    const [a, b] = [units[i], units[j]];
    if (a.slug === b.slug || (!a.isNew && !b.isNew)) continue;
    const value = jaccard(a.grams, b.grams);
    pairs += 1;
    sum += value;
    if (value > max.value) max = { value, between: `${a.id} × ${b.id}` };
  }
}
const pct = (v) => `${(v * 100).toFixed(3)}%`;
console.log(`overlap: 5-gram Jaccard over ${pairs} outcome pairs across quizzes: mean ${pct(pairs ? sum / pairs : 0)}, max ${pct(max.value)} (${max.between})`);
