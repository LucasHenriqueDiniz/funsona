import fs from "fs/promises";
import path from "path";
import { config } from "dotenv";

config();

const SD_URL = "http://127.0.0.1:7860";
const QUIZ_ID = "3918ecda-7185-4a14-9d25-548a54858a5f";
const BASE_DIR = path.join(process.cwd(), "refactored-quizzes", QUIZ_ID);

// The same subject prompt (pasta), but with the "standout" qualifiers the master
// prompt now asks for explicitly on the cover.
const BOOSTED_PROMPT =
  "editorial flat vector illustration, no people, single hero composition: one elegant bowl of swirled " +
  "tagliatelle pasta as the clear focal point, surrounded by soft blurred accents of tomato, basil and cheese, " +
  "strong focal point, rule of thirds, balanced composition, polished professional illustration, rich detail, " +
  "high production value, vibrant but tasteful color palette, soft depth and lighting, eye-catching thumbnail quality, " +
  "personality quiz mood, no readable text, no labels, no logos";

const NEGATIVE_PROMPT =
  "text, words, letters, logo, watermark, signature, low quality, blurry, jpeg artifacts, deformed, bad anatomy, " +
  "nsfw, nude, anime girl, sexy character, human model, cluttered, busy composition, too many objects";

async function generate(width: number, height: number, steps: number, cfg: number, outFile: string) {
  console.log(`\n🎨 Generating ${outFile} (${width}x${height}, steps=${steps}, cfg=${cfg})...`);
  const res = await fetch(`${SD_URL}/sdapi/v1/txt2img`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: BOOSTED_PROMPT,
      negative_prompt: NEGATIVE_PROMPT,
      steps,
      width,
      height,
      cfg_scale: cfg,
      sampler_name: "DPM++ 2M Karras",
      batch_size: 1,
    }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!res.ok) throw new Error(`SD HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
  const data = (await res.json()) as any;
  const buffer = Buffer.from(data.images[0], "base64");
  await fs.writeFile(path.join(BASE_DIR, outFile), buffer);
  console.log(`✅ Saved: ${outFile}`);
}

async function main() {
  // The same prompt, now on the vanilla SD1.5 checkpoint (no anime bias).
  await generate(1024, 1024, 28, 7.5, "banner-boosted-v2-sd15.png");
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
