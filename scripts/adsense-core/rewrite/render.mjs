// Check rewritten quiz pages as they are served. Slice 5 of docs/plans/adsense-low-value-content.
//
// Per draft: HTTP status, the draft's title, all three intro texts and every outcome's opening in
// the HTML, and third-party media inside the quiz body. The body ends where the related-quiz cards
// ("Mais para jogar") begin; those cards show other quizzes, so their media is counted apart.
//
// Usage: node scripts/adsense-core/rewrite/render.mjs <base-url> <draft.json> [...]
//   e.g. node scripts/adsense-core/rewrite/render.mjs https://funsona.com scripts/adsense-core/drafts/*.json

import { readFileSync } from "node:fs";

const [base, ...files] = process.argv.slice(2);
if (!base || files.length === 0) {
  console.error("usage: render.mjs <base-url> <draft.json> [...]");
  process.exit(2);
}

const RELATED_MARKER = "Mais para jogar";
const OWN_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|([a-z0-9-]+\.)*funsona\.com)(:\d+)?\//i;
const MEDIA = /\.(png|jpe?g|gif|webp|avif|svg|mp4|webm)(\?|$)/i;
const KNOWN_THIRD_PARTY = /quizpanda|giphy|unsplash|tenor/i;

const decode = (s) =>
  s.replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const opening = (text, n) => text.trim().split(/\s+/).slice(0, n).join(" ");
const thirdPartyMedia = (html) =>
  [...html.matchAll(/(?:src|href|content|srcset)="(https?:\/\/[^"\s]+)/g)]
    .map((m) => m[1])
    .filter((url) => (MEDIA.test(url) || KNOWN_THIRD_PARTY.test(url)) && !OWN_HOST.test(url));

let passed = 0;
for (const file of files) {
  const draft = JSON.parse(readFileSync(file, "utf8"));
  const res = await fetch(`${base.replace(/\/$/, "")}/quiz/${draft.slug}`);
  const html = await res.text();
  const cut = html.indexOf(RELATED_MARKER);
  const body = cut > 0 ? html.slice(0, cut) : html;
  const text = decode(body);

  const intro = ["context", "what_youll_learn", "how_scoring_works"].filter((k) => text.includes(opening(draft.intro_content[k], 8))).length;
  const outcomes = draft.outcomes.filter((o) => text.includes(opening(o.description, 10))).length;
  const title = text.includes(draft.title);
  const foreign = thirdPartyMedia(body).length;
  const mentions = (body.match(new RegExp(KNOWN_THIRD_PARTY.source, "gi")) ?? []).length;
  const related = cut > 0 ? thirdPartyMedia(html.slice(cut)).length : 0;

  const ok = res.status === 200 && cut > 0 && title && intro === 3 && outcomes === draft.outcomes.length && foreign === 0 && mentions === 0;
  if (ok) passed += 1;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${res.status}  ${draft.slug}  title ${title ? "ok" : "MISSING"}  intro ${intro}/3  ` +
      `outcomes ${outcomes}/${draft.outcomes.length}  third-party media in body ${foreign} (quizpanda/giphy/unsplash/tenor mentions ${mentions})  in related cards ${related}` +
      (cut > 0 ? "" : `  ("${RELATED_MARKER}" not found)`),
  );
}
console.log(`---- ${passed} of ${files.length} pages pass`);
process.exit(passed === files.length ? 0 : 1);
