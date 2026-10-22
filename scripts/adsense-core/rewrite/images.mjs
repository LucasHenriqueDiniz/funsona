// Slice 5b of docs/plans/adsense-low-value-content: images for the curated core.
//
//   generate <prompts.tsv>   one fal job per line "slug<TAB>prompt"; downloads to images/<slug>/cover.webp
//   fetch <picks.tsv>        one licensed file per line "slug<TAB>url<TAB>licence<TAB>source page"
//   sheet                    contact sheet of every cover, for the owner's review
//   upload-covers            approved covers to R2, then cover_url in remote D1 (curated, published only)
//   generate-outcomes <tsv>  one low-quality gpt-image-2 square per line "slug<TAB>index<TAB>key<TAB>prompt"
//   sheet-outcomes           numbered contact sheets of the outcome images, a few quizzes per sheet
//   upload-outcomes          approved outcome images to R2, then outcomes[i].image_url in remote D1
//
// Everything lands in scripts/adsense-core/images/ (gitignored) with a manifest.jsonl line per
// file: where it came from, under which licence or with which prompt, and what it cost. The fal
// key is read from the macOS Keychain (service "fal.ai"), never from a file.
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { ROOT, query, executeFile, sqlString } from "./lib.mjs";

const DIR = join(ROOT, "scripts/adsense-core/images");
const ENDPOINT = "fal-ai/nano-banana-2";
const PRICE_PER_IMAGE = 0.08; // fal model page, 2026-10-20; get_pricing confirmed it
const STYLE = " Painterly cinematic illustration, rich saturated colors with deep shadows, soft volumetric light, " +
  "wide composition with calm space at the bottom for a title. No people, no characters, no faces, no text, no letters, no logos.";

// Outcome images show in a box of at most 208 px (QuizResultScreen.tsx); low quality is
// indistinguishable there and costs about a tenth of medium (2026-10-22 pilot, owner's choice).
const OUTCOME_ENDPOINT = "openai/gpt-image-2";
const OUTCOME_PRICE = 0.006; // fal model page, square 1024 px, low quality
const OUTCOME_STYLE = " Centered emblem-like illustration on a dark background, rich colors. No people, no characters, " +
  "no faces, no silhouettes, no text, no letters, no logos.";
const outcomeFile = (slug, index, key) => join(DIR, slug, `outcome-${index}-${String(key).replace(/[^a-z0-9_-]/gi, "_")}.webp`);

const lines = (file) => readFileSync(file, "utf8").split("\n").filter((l) => l.trim()).map((l) => l.split("\t"));
const record = (entry) => appendFileSync(join(DIR, "manifest.jsonl"), JSON.stringify({ at: new Date().toISOString(), ...entry }) + "\n");
const falKey = () => execFileSync("security", ["find-generic-password", "-a", process.env.USER, "-s", "fal.ai", "-w"], { encoding: "utf8" }).trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(url, file) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": "FunSonaCoverFetch/1.0 (https://funsona.com)" } });
    if (res.ok) return writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    if (res.status !== 429 || attempt === 5) throw new Error(`${res.status} ${url}`);
    await sleep(5000 * attempt); // Wikimedia rate-limits bursts of file requests
  }
}

async function generate(file) {
  const auth = { Authorization: `Key ${falKey()}`, "Content-Type": "application/json" };
  const jobs = [];
  for (const [slug, prompt] of lines(file)) {
    const input = { prompt: prompt + STYLE, aspect_ratio: "4:3", resolution: "1K", output_format: "webp" };
    const res = await fetch(`https://queue.fal.run/${ENDPOINT}`, { method: "POST", headers: auth, body: JSON.stringify(input) });
    if (!res.ok) throw new Error(`submit ${slug}: ${res.status} ${await res.text()}`);
    jobs.push({ slug, input, ...(await res.json()) });
  }
  for (const job of jobs) {
    let status;
    do { await sleep(3000); status = await (await fetch(job.status_url, { headers: auth })).json(); } while (status.status !== "COMPLETED");
    const out = await (await fetch(job.response_url, { headers: auth })).json();
    mkdirSync(join(DIR, job.slug), { recursive: true });
    await download(out.images[0].url, join(DIR, job.slug, "cover.webp"));
    record({ slug: job.slug, kind: "cover", source: "fal", endpoint: ENDPOINT, request_id: job.request_id, prompt: job.input.prompt, cost_usd: PRICE_PER_IMAGE });
    console.log(`ok  ${job.slug}`);
  }
}

async function fetchLicensed(file) {
  for (const [slug, url, licence, page] of lines(file)) {
    if (!["pd", "cc0"].includes(licence)) throw new Error(`${slug}: licence ${licence} needs on-page credit`);
    mkdirSync(join(DIR, slug), { recursive: true });
    const raw = join(DIR, slug, "source");
    if (existsSync(join(DIR, slug, "cover.webp"))) continue;
    await download(url, raw);
    await sleep(1500);
    execFileSync("magick", [raw, "-auto-orient", "-resize", "1600x1600>", "-quality", "82", join(DIR, slug, "cover.webp")]);
    record({ slug, kind: "cover", source: "commons", url, licence, page, cost_usd: 0 });
    console.log(`ok  ${slug}`);
  }
}

function sheet() {
  const font = "/System/Library/Fonts/Supplemental/Arial.ttf";
  const slugs = readdirSync(DIR).filter((s) => existsSync(join(DIR, s, "cover.webp"))).sort();
  const args = ["montage", "-font", font, "-pointsize", "14", "-fill", "white"];
  slugs.forEach((s, i) => args.push("-label", `${i + 1}. ${s.slice(0, 38)}`, join(DIR, s, "cover.webp")));
  execFileSync("magick", [...args, "-tile", "6x", "-geometry", "320x240+6+6", "-background", "#111", join(DIR, "sheet.jpg")]);
  console.log(`${slugs.length} covers -> ${join(DIR, "sheet.jpg")}`);
}

async function generateOutcomes(file) {
  const auth = { Authorization: `Key ${falKey()}`, "Content-Type": "application/json" };
  const todo = lines(file).filter(([slug, index, key]) => !existsSync(outcomeFile(slug, index, key)));
  let spent = 0, failed = 0;
  for (let i = 0; i < todo.length; i += 24) { // a batch at a time keeps the queue and the poll loop small
    const jobs = [];
    for (const [slug, index, key, prompt] of todo.slice(i, i + 24)) {
      const input = { prompt: prompt + OUTCOME_STYLE, image_size: "square_hd", quality: "low", output_format: "webp" };
      const res = await fetch(`https://queue.fal.run/${OUTCOME_ENDPOINT}`, { method: "POST", headers: auth, body: JSON.stringify(input) });
      if (!res.ok) { failed++; console.log(`fail submit ${slug} #${index}: ${res.status}`); continue; }
      jobs.push({ slug, index, key, input, ...(await res.json()) });
    }
    for (const job of jobs) {
      let status;
      do { await sleep(2000); status = await (await fetch(job.status_url, { headers: auth })).json(); } while (!["COMPLETED", "ERROR"].includes(status.status));
      const out = await (await fetch(job.response_url, { headers: auth })).json();
      const url = out?.images?.[0]?.url;
      if (!url) { failed++; console.log(`fail ${job.slug} #${job.index}: ${JSON.stringify(out).slice(0, 200)}`); continue; }
      mkdirSync(join(DIR, job.slug), { recursive: true });
      await download(url, outcomeFile(job.slug, job.index, job.key));
      record({ slug: job.slug, kind: "outcome", index: Number(job.index), key: job.key, source: "fal", endpoint: OUTCOME_ENDPOINT,
        request_id: job.request_id, prompt: job.input.prompt, cost_usd: OUTCOME_PRICE });
      spent += OUTCOME_PRICE;
    }
    console.log(`${Math.min(i + 24, todo.length)}/${todo.length} done, ~$${spent.toFixed(2)} this run, ${failed} failed`);
  }
}

function sheetOutcomes() {
  const font = "/System/Library/Fonts/Supplemental/Arial.ttf";
  const slugs = readdirSync(DIR).filter((s) => existsSync(join(DIR, s, "cover.webp"))).sort();
  const per = 6;
  for (let i = 0; i < slugs.length; i += per) {
    const args = ["montage", "-font", font, "-pointsize", "13", "-fill", "white"];
    for (const [n, slug] of slugs.slice(i, i + per).entries()) {
      const files = readdirSync(join(DIR, slug)).filter((f) => /^outcome-\d+-/.test(f)).sort((a, b) => parseInt(a.split("-")[1]) - parseInt(b.split("-")[1]));
      files.forEach((f) => args.push("-label", `${i + n + 1}.${f.split("-")[1]} ${slug.slice(0, 22)}`, join(DIR, slug, f)));
    }
    const out = join(DIR, `outcomes-${String(i / per + 1).padStart(2, "0")}.jpg`);
    execFileSync("magick", [...args, "-tile", "8x", "-geometry", "200x200+4+4", "-background", "#111", out]);
    console.log(out);
  }
}

function uploadOutcomes() {
  const core = new Map(query("remote", "SELECT slug, content FROM quizzes WHERE status = 'PUBLISHED' AND ads_eligible = 1")
    .map((r) => [r.slug, typeof r.content === "string" ? JSON.parse(r.content) : r.content]));
  const updates = [];
  for (const slug of readdirSync(DIR).filter((s) => core.has(s))) {
    const outcomes = core.get(slug).outcomes || [];
    for (const f of readdirSync(join(DIR, slug)).filter((f) => /^outcome-\d+-/.test(f))) {
      const index = parseInt(f.split("-")[1]);
      const key = outcomes[index]?.key;
      if (key == null || outcomeFile(slug, index, key) !== join(DIR, slug, f)) throw new Error(`${slug}/${f}: outcome ${index} is no longer this key`);
      const hash = createHash("sha256").update(readFileSync(join(DIR, slug, f))).digest("hex").slice(0, 10);
      const r2 = `editorial/${slug}/outcome-${index}-${hash}.webp`;
      execFileSync("npx", ["--no-install", "wrangler", "r2", "object", "put", `funsona-quiz-images/${r2}`, "--file", join(DIR, slug, f),
        "--content-type", "image/webp", "--cache-control", "public, max-age=31536000, immutable"], { cwd: join(ROOT, "apps/api"), stdio: "pipe" });
      const url = `https://api.funsona.com/media/quiz-images/${r2}`;
      // json_set on one array slot, guarded by the key at that slot, so a reordered quiz is skipped instead of mislabelled
      updates.push(`UPDATE quizzes SET content = json_set(content, '$.outcomes[${index}].image_url', ${sqlString(url)}) ` +
        `WHERE slug = ${sqlString(slug)} AND status = 'PUBLISHED' AND ads_eligible = 1 AND json_extract(content, '$.outcomes[${index}].key') = ${sqlString(key)};`);
      record({ slug, kind: "outcome-upload", index, key, r2_key: r2, url });
    }
    console.log(`r2  ${slug}`);
  }
  const sql = updates.join("\n") + "\n";
  writeFileSync(join(DIR, "outcomes.sql"), sql);
  executeFile("remote", sql); // takes SQL text, not a path
  console.log(`d1  ${updates.length} image_url updates`);
}

// Upload only after the owner approved the contact sheet and the D1 backup is taken (slice 5b).
function uploadCovers() {
  const core = new Set(query("remote", "SELECT slug FROM quizzes WHERE status = 'PUBLISHED' AND ads_eligible = 1").map((r) => r.slug));
  const slugs = readdirSync(DIR).filter((s) => existsSync(join(DIR, s, "cover.webp")));
  const stray = slugs.filter((s) => !core.has(s));
  if (stray.length) throw new Error(`not curated and published: ${stray.join(", ")}`);
  const updates = [];
  for (const slug of slugs) {
    const file = join(DIR, slug, "cover.webp");
    const hash = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 10);
    const key = `editorial/${slug}/cover-${hash}.webp`; // hash in the name: the object is cached as immutable
    execFileSync("npx", ["--no-install", "wrangler", "r2", "object", "put", `funsona-quiz-images/${key}`, "--file", file,
      "--content-type", "image/webp", "--cache-control", "public, max-age=31536000, immutable"], { cwd: join(ROOT, "apps/api"), stdio: "pipe" });
    const url = `https://api.funsona.com/media/quiz-images/${key}`;
    updates.push(`UPDATE quizzes SET cover_url = ${sqlString(url)} WHERE slug = ${sqlString(slug)} AND status = 'PUBLISHED' AND ads_eligible = 1;`);
    record({ slug, kind: "cover-upload", r2_key: key, url });
    console.log(`r2  ${key}`);
  }
  const sql = updates.join("\n") + "\n";
  writeFileSync(join(DIR, "covers.sql"), sql); // kept next to the manifest as the record of what was written
  executeFile("remote", sql); // takes SQL text, not a path
  console.log(`d1  ${updates.length} cover_url updates`);
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "generate") await generate(arg);
else if (cmd === "fetch") await fetchLicensed(arg);
else if (cmd === "sheet") sheet();
else if (cmd === "upload-covers") uploadCovers();
else if (cmd === "generate-outcomes") await generateOutcomes(arg);
else if (cmd === "sheet-outcomes") sheetOutcomes();
else if (cmd === "upload-outcomes") uploadOutcomes();
else { console.error("usage: images.mjs generate <prompts.tsv> | fetch <picks.tsv> | sheet | upload-covers | generate-outcomes <tsv> | sheet-outcomes | upload-outcomes"); process.exit(1); }
