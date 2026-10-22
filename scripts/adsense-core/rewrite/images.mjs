// Slice 5b of docs/plans/adsense-low-value-content: images for the curated core.
//
//   generate <prompts.tsv>   one fal job per line "slug<TAB>prompt"; downloads to images/<slug>/cover.webp
//   fetch <picks.tsv>        one licensed file per line "slug<TAB>url<TAB>licence<TAB>source page"
//   sheet                    contact sheet of every cover, for the owner's review
//   upload-covers            approved covers to R2, then cover_url in remote D1 (curated, published only)
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
else { console.error("usage: images.mjs generate <prompts.tsv> | fetch <picks.tsv> | sheet | upload-covers"); process.exit(1); }
