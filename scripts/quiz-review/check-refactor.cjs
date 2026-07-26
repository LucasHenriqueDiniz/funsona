const Database = require('better-sqlite3');
const db = new Database('quiz-review.db', { readonly: true });

const total = db.prepare('SELECT COUNT(*) c FROM quiz_reviews').get().c;

// Contar quantos têm new_questions
const withQuestions = db.prepare(`
  SELECT COUNT(*) c FROM quiz_reviews
  WHERE review_json LIKE '%"new_questions"%'
    AND review_json LIKE '%"text"%'
`).get().c;

// Amostra de um com new_questions
const sample = db.prepare(`
  SELECT id, review_json FROM quiz_reviews
  LIMIT 1
`).get();

if (sample) {
  const review = JSON.parse(sample.review_json);
  const hasQuestions = review.new_questions && review.new_questions.length > 0;
  console.log('Exemplo:', sample.id);
  console.log('Has new_questions:', hasQuestions);
  if (hasQuestions) {
    console.log('Count:', review.new_questions.length);
  }
}

console.log('\n=== RESULTADO ===');
console.log('Total analisados:', total);
console.log('Com new_questions:', withQuestions);
console.log('');
if (withQuestions > 0) {
  console.log('✅ Refactor FOI executado (GPT gerou perguntas/resultados)');
} else {
  console.log('❌ Só ANÁLISE foi feita (sem geração de perguntas/resultados via GPT)');
}
