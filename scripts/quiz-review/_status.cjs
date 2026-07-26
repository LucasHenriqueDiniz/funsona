const Database = require('better-sqlite3');
const db = new Database('quiz-review.db', { readonly: true });
const stats = db.prepare("SELECT status, COUNT(*) c FROM quiz_reviews GROUP BY status").all();
console.log('=== quiz_reviews ===');
console.log(JSON.stringify(stats, null, 2));

const withPlan = db.prepare("SELECT COUNT(*) c FROM quiz_reviews WHERE review_json IS NOT NULL").all();
let withImagePlan = 0;
const rows = db.prepare("SELECT review_json FROM quiz_reviews WHERE review_json IS NOT NULL").all();
for (const r of rows) {
  try { if (JSON.parse(r.review_json).image_plan) withImagePlan++; } catch {}
}
console.log('quizzes com image_plan:', withImagePlan, '/', rows.length);

const imgDb = new Database('image-queue.db', { readonly: true });
const qstats = imgDb.prepare("SELECT status, COUNT(*) c FROM image_queue GROUP BY status").all();
console.log('\n=== image_queue ===');
console.log(JSON.stringify(qstats, null, 2));
