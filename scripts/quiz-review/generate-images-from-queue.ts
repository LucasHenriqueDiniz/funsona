import fs from "fs/promises";
import path from "path";
import { config } from "dotenv";
import { getImageQueueDb, getPendingImages, updateImageStatus, getQueueStats, ImageQueueItem } from "./db-image-queue.js";

config();

const SD_URL = process.env.SD_URL ?? "http://127.0.0.1:7860";
const BATCH_SIZE = parseInt(process.env.IMAGE_BATCH_SIZE ?? "5");
const MAX_HOURS = parseInt(process.env.IMAGE_MAX_HOURS ?? "11");
const IMAGE_TIMEOUT_MS = parseInt(process.env.IMAGE_TIMEOUT_MS ?? "180000");

const db_queue = getImageQueueDb();

const REFACTORED_DIR = path.join(process.cwd(), "refactored-quizzes");

// anything-v5 é treinado quase exclusivamente em anime — usá-lo para estilos
// "sem pessoas" (comida, objetos, infográficos) faz o modelo ignorar o prompt
// e desenhar uma personagem anime de qualquer jeito, especialmente em cfg alto.
// Mapeia cada visual_style para um checkpoint adequado; só anime_safe usa o
// checkpoint de anime — todo o resto usa SD1.5 vanilla (sem viés de estilo).
const CHECKPOINT_BY_STYLE: Record<string, string> = {
  anime_safe: "anything-v5.safetensors",
  editorial_flat_vector: "v1-5-pruned-emaonly-fp16.safetensors",
  editorial_flat_vector_no_people: "v1-5-pruned-emaonly-fp16.safetensors",
  playful_3d_clay: "v1-5-pruned-emaonly-fp16.safetensors",
  game_ui_illustration: "v1-5-pruned-emaonly-fp16.safetensors",
  cinematic_poster_safe: "v1-5-pruned-emaonly-fp16.safetensors",
  educational_infographic: "v1-5-pruned-emaonly-fp16.safetensors",
};
const DEFAULT_CHECKPOINT = "v1-5-pruned-emaonly-fp16.safetensors";

let currentCheckpoint: string | null = null;

async function ensureCheckpoint(visualStyle: string | null): Promise<void> {
  const desired = (visualStyle && CHECKPOINT_BY_STYLE[visualStyle]) || DEFAULT_CHECKPOINT;
  if (desired === currentCheckpoint) return;

  console.log(`  🔄 Trocando checkpoint: ${currentCheckpoint ?? "?"} → ${desired}`);
  const res = await fetch(`${SD_URL}/sdapi/v1/options`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sd_model_checkpoint: desired }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Falha ao trocar checkpoint: HTTP ${res.status}`);
  currentCheckpoint = desired;
  await new Promise((r) => setTimeout(r, 2000)); // tempo para o modelo carregar na VRAM
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function generateAndSaveImage(item: ImageQueueItem): Promise<{ localPath: string }> {
  console.log(`  🎨 Gerando "${item.item_type}/${item.item_id}" (${item.visual_style ?? "default"})...`);

  await ensureCheckpoint(item.visual_style);

  // Otimização de qualidade: usar sampler melhor + aumentar steps se necessário
  const samplerName = item.sampler || "DPM++ 2M Karras";
  const optimizedSteps = Math.min(item.steps + 5, 40); // +5 steps, max 40
  const optimizedCfg = Math.min(item.cfg_scale + 0.5, 10.5); // +0.5 cfg, max 10.5

  const res = await fetch(`${SD_URL}/sdapi/v1/txt2img`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: item.prompt,
      negative_prompt: item.negative_prompt,
      steps: optimizedSteps,
      width: item.width,
      height: item.height,
      cfg_scale: optimizedCfg,
      sampler_name: samplerName,
      batch_size: 1,
    }),
    signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SD HTTP ${res.status}: ${err.slice(0, 150)}`);
  }

  const data = (await res.json()) as any;
  const b64 = data.images?.[0];
  if (!b64) throw new Error("SD não retornou imagem");

  const buffer = Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ""), "base64");

  const localDir = path.join(REFACTORED_DIR, item.quiz_id);
  await ensureDir(localDir);

  let localPath: string;
  if (item.item_type === "banner") {
    localPath = path.join(localDir, "banner.png");
  } else if (item.item_type === "question") {
    const qDir = path.join(localDir, "questions");
    await ensureDir(qDir);
    localPath = path.join(qDir, `${item.item_id}.png`);
  } else if (item.item_type === "outcome") {
    const oDir = path.join(localDir, "outcomes");
    await ensureDir(oDir);
    localPath = path.join(oDir, `${item.item_id}.png`);
  } else {
    localPath = path.join(localDir, `${item.item_type}_${item.item_id}.png`);
  }

  await fs.writeFile(localPath, buffer);
  console.log(`    ✅ Salvo em ${path.relative(process.cwd(), localPath)}`);

  return { localPath };
}

async function processQueue(): Promise<void> {
  const deadline = new Date(Date.now() + MAX_HOURS * 3600_000);
  let totalGenerated = 0;
  let totalFailed = 0;

  console.log(`\n🖼️  Image Queue Consumer (Stable Diffusion local: ${SD_URL})`);
  console.log(`   Prazo: ${deadline.toLocaleTimeString()}`);
  console.log(`   Rodando até ${MAX_HOURS}h...\n`);

  while (new Date() < deadline) {
    const pending = getPendingImages(db_queue, BATCH_SIZE);
    if (!pending.length) {
      console.log(`[${new Date().toLocaleTimeString()}] ✅ Fila vazia — aguardando 30s...`);
      await new Promise((r) => setTimeout(r, 30_000));
      continue;
    }

    console.log(`[${new Date().toLocaleTimeString()}] 📊 Processando ${pending.length} imagem(ns)`);

    for (const item of pending) {
      try {
        updateImageStatus(db_queue, item.id, "generating");
        const { localPath } = await generateAndSaveImage(item);
        updateImageStatus(db_queue, item.id, "done", { local_path: localPath });
        totalGenerated++;
        console.log(`   ✅ Concluído`);
      } catch (e: any) {
        console.log(`   ❌ Erro: ${e.message}`);
        updateImageStatus(db_queue, item.id, "failed", { error: e.message });
        totalFailed++;

        if (e.message?.includes("ECONNREFUSED")) {
          console.log("   ⏳ Forge não respondendo — aguardando 30s...");
          await new Promise((r) => setTimeout(r, 30_000));
        }
      }

      if (pending.indexOf(item) < pending.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    const stats = getQueueStats(db_queue);
    console.log(
      `\n📈 Stats: pending=${stats.pending ?? 0}, done=${stats.done ?? 0}, failed=${stats.failed ?? 0}\n`
    );
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ ${totalGenerated} geradas | ❌ ${totalFailed} falhas`);
  console.log(`Prazo atingido — encerrando.`);
}

processQueue().catch(console.error);
