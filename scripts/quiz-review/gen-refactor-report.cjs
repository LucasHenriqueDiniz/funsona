const fs = require("fs");

const rows = JSON.parse(fs.readFileSync("refactored-dump.json", "utf-8"));

function esc(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function scoreColor(score) {
  if (score >= 7) return "#2e7d32";
  if (score >= 5) return "#f9a825";
  return "#c62828";
}

const cards = rows.map((r, i) => {
  let review = {};
  try { review = JSON.parse(r.review_json); } catch {}

  const issues = (review.issues || []).map((iss) => `<li>${esc(iss)}</li>`).join("");
  const questions = (review.new_questions || []).map((q) => `
    <div class="question">
      <div class="qtext">${esc(q.text)}</div>
      <ul class="options">
        ${(q.options || []).map((o) => `<li>${esc(o.text)}</li>`).join("")}
      </ul>
    </div>
  `).join("");

  const outcomes = (review.new_outcomes || []).map((o) => `
    <div class="outcome">
      <div class="otitle">${esc(o.title)} <span class="okey">(${esc(o.key)})</span></div>
      <div class="odesc">${esc(o.description)}</div>
    </div>
  `).join("");

  return `
  <div class="card">
    <div class="card-header">
      <span class="idx">#${i + 1}</span>
      <span class="score" style="background:${scoreColor(review.score)}">${review.score ?? "?"}/10</span>
      <span class="id">${esc(r.id)}</span>
    </div>
    <div class="titles">
      <div class="title-old">${esc(r.original_title)}</div>
      <div class="arrow">→</div>
      <div class="title-new">${esc(review.new_title)}</div>
    </div>
    <div class="desc"><strong>Nova descrição:</strong> ${esc(review.new_description)}</div>
    ${review.summary ? `<div class="summary"><strong>Resumo do ChatGPT:</strong> ${esc(review.summary)}</div>` : ""}
    ${issues ? `<div class="issues"><strong>Issues:</strong><ul>${issues}</ul></div>` : ""}
    ${questions ? `<details><summary>Perguntas (${(review.new_questions || []).length})</summary>${questions}</details>` : ""}
    ${outcomes ? `<details><summary>Outcomes (${(review.new_outcomes || []).length})</summary>${outcomes}</details>` : ""}
  </div>`;
}).join("\n");

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Quizzes Refatorados — Revisão</title>
<style>
  body { font-family: -apple-system, Segoe UI, Arial, sans-serif; background:#f4f4f7; margin:0; padding:20px; color:#222; }
  h1 { font-size: 22px; }
  .meta { color:#666; margin-bottom:20px; }
  .card { background:#fff; border-radius:8px; padding:16px 20px; margin-bottom:16px; box-shadow:0 1px 3px rgba(0,0,0,0.08); }
  .card-header { display:flex; align-items:center; gap:10px; margin-bottom:8px; font-size:13px; }
  .idx { color:#999; font-weight:bold; }
  .score { color:#fff; font-weight:bold; border-radius:4px; padding:2px 8px; font-size:12px; }
  .id { color:#aaa; font-family:monospace; font-size:11px; }
  .titles { display:flex; align-items:center; gap:10px; margin-bottom:8px; flex-wrap:wrap; }
  .title-old { color:#999; text-decoration:line-through; font-size:14px; }
  .title-new { font-weight:bold; font-size:16px; }
  .arrow { color:#999; }
  .desc { margin:8px 0; font-size:14px; line-height:1.4; }
  .summary { margin:8px 0; font-size:13px; color:#555; background:#f0f0f5; padding:8px; border-radius:4px; }
  .issues { margin:8px 0; font-size:13px; color:#a02020; }
  .issues ul { margin:4px 0 0 18px; }
  details { margin-top:8px; font-size:13px; }
  summary { cursor:pointer; font-weight:bold; color:#444; }
  .question { margin:8px 0 0 12px; }
  .qtext { font-weight:bold; margin-bottom:4px; }
  .options { margin:0 0 0 18px; }
  .outcome { margin:8px 0 0 12px; }
  .otitle { font-weight:bold; }
  .okey { color:#999; font-size:11px; font-family:monospace; }
  .odesc { color:#555; }
</style>
</head>
<body>
  <h1>Quizzes Refatorados</h1>
  <div class="meta">${rows.length} quizzes na 2ª passada (refactor) — ordenados do mais recente pro mais antigo</div>
  ${cards}
</body>
</html>`;

fs.writeFileSync("refactor-report.html", html, "utf-8");
console.log("Gerado: refactor-report.html (" + rows.length + " quizzes)");
