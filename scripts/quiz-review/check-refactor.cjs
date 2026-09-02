const Database = require('better-sqlite3');
const db = new Database('quiz-review.db', { readonly: true });

const total = db.prepare('SELECT COUNT(*) c FROM quiz_reviews').get().c;

// Count how many carry new_questions
const withQuestions = db.prepare(`
  SELECT COUNT(*) c FROM quiz_reviews
  WHERE review_json LIKE '%"new_questions"%'
    AND review_json LIKE '%"text"%'
`).get().c;

// Sample one row that carries new_questions
const sample = db.prepare(`
  SELECT id, review_json FROM quiz_reviews
  LIMIT 1
`).get();

if (sample) {
  const review = JSON.parse(sample.review_json);
  const hasQuestions = review.new_questions && review.new_questions.length > 0;
  console.log('Sample:', sample.id);
  console.log('Has new_questions:', hasQuestions);
  if (hasQuestions) {
    console.log('Count:', review.new_questions.length);
  }
}

console.log('\n=== RESULT ===');
console.log('Total analysed:', total);
console.log('With new_questions:', withQuestions);
console.log('');
if (withQuestions > 0) {
  console.log('✅ Refactor DID run (GPT generated questions/outcomes)');
} else {
  console.log('❌ Only the ANALYSIS ran (no questions/outcomes generated through GPT)');
}
