require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const id = process.argv[2] || "bc949212-4eb3-45ba-a37f-d5f87159360b";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

(async () => {
  const { data: quiz, error } = await db.from("quizzes").select("*").eq("id", id).single();
  if (error || !quiz) { console.error("Quiz não encontrado:", error?.message); process.exit(1); }

  const content = quiz.content || {};
  const questions = content.questions || [];
  const outcomes = content.outcomes || [];
  const cover = quiz.cover_url || content.coverUrl;

  const questionsHtml = questions.map((q, qi) => `
    <div class="q-card">
      <div class="q-num">Pergunta ${qi + 1} de ${questions.length}</div>
      ${q.imageUrl ? `<img class="q-img" src="${esc(q.imageUrl)}" />` : ""}
      <div class="q-text">${esc(q.title)}</div>
      <div class="q-options">
        ${(q.answers || []).map((a) => `
          <div class="option">
            ${a.imageUrl ? `<img class="opt-img" src="${esc(a.imageUrl)}" />` : ""}
            <span>${esc(a.label)}</span>
            ${quiz.type === "TRIVIA" && a.isCorrect ? `<span class="correct">✓ correta</span>` : ""}
          </div>`).join("")}
      </div>
    </div>
  `).join("");

  const outcomesHtml = outcomes.map((o) => `
    <div class="outcome-card">
      ${o.imageUrl ? `<img class="outcome-img" src="${esc(o.imageUrl)}" />` : `<div class="outcome-img placeholder">sem imagem</div>`}
      <div class="outcome-body">
        <div class="outcome-title">${esc(o.title)}</div>
        <div class="outcome-desc">${esc(o.description)}</div>
        <div class="outcome-key">key: ${esc(o.key)}</div>
      </div>
    </div>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${esc(quiz.title)}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Arial, sans-serif; background:#eef0f5; margin:0; padding:24px; color:#222; }
  .wrap { max-width: 720px; margin: 0 auto; }
  .cover { width:100%; max-height:280px; object-fit:cover; border-radius:12px; margin-bottom:16px; background:#ddd; }
  .cover.placeholder { display:flex; align-items:center; justify-content:center; height:160px; color:#999; font-size:13px; }
  h1 { font-size: 26px; margin: 8px 0; }
  .desc { color:#555; font-size:15px; line-height:1.5; margin-bottom:24px; }
  .badge { display:inline-block; background:#5b5fc7; color:#fff; font-size:11px; border-radius:4px; padding:2px 8px; margin-bottom:8px; }
  .q-card { background:#fff; border-radius:10px; padding:18px; margin-bottom:14px; box-shadow:0 1px 3px rgba(0,0,0,0.06); }
  .q-num { color:#999; font-size:12px; margin-bottom:6px; }
  .q-img { width:100%; max-height:160px; object-fit:cover; border-radius:8px; margin-bottom:8px; }
  .q-text { font-weight:bold; font-size:16px; margin-bottom:10px; }
  .q-options { display:flex; flex-direction:column; gap:8px; }
  .option { border:1px solid #ddd; border-radius:8px; padding:10px 12px; font-size:14px; display:flex; align-items:center; gap:8px; }
  .opt-img { width:36px; height:36px; object-fit:cover; border-radius:6px; }
  .correct { margin-left:auto; color:#2e7d32; font-size:12px; font-weight:bold; }
  h2 { margin-top:28px; font-size:18px; }
  .outcome-card { background:#fff; border-radius:10px; padding:14px; margin-bottom:12px; display:flex; gap:12px; box-shadow:0 1px 3px rgba(0,0,0,0.06); }
  .outcome-img { width:80px; height:80px; object-fit:cover; border-radius:8px; flex-shrink:0; background:#ddd; }
  .outcome-img.placeholder { display:flex; align-items:center; justify-content:center; font-size:10px; color:#999; text-align:center; }
  .outcome-title { font-weight:bold; margin-bottom:4px; }
  .outcome-desc { color:#555; font-size:13px; line-height:1.4; }
  .outcome-key { color:#bbb; font-size:10px; font-family:monospace; margin-top:4px; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="badge">${esc(quiz.type)} · ${esc(quiz.language)} · status: ${esc(quiz.status)}</div>
    ${cover ? `<img class="cover" src="${esc(cover)}" />` : `<div class="cover placeholder">sem imagem de capa</div>`}
    <h1>${esc(quiz.title)}</h1>
    <div class="desc">${esc(quiz.description)}</div>

    <h2>Perguntas (${questions.length})</h2>
    ${questionsHtml}

    ${outcomes.length ? `<h2>Resultados possíveis (${outcomes.length})</h2>${outcomesHtml}` : ""}
  </div>
</body>
</html>`;

  fs.writeFileSync("quiz-preview.html", html, "utf-8");
  console.log("Gerado: quiz-preview.html →", quiz.title);
})();
