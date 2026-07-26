const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('quiz-review.db', { readonly: true });

// Pegar quizzes refatorados que tem imagens
const quizzes = db.prepare(`
  SELECT * FROM quiz_reviews
  WHERE status = 'refactored'
  ORDER BY id
`).all();

console.log(`Total de quizzes: ${quizzes.length}`);

let found = null;
for (const quiz of quizzes) {
  const quizDir = path.join('./refactored-quizzes', quiz.id);
  if (fs.existsSync(quizDir)) {
    const files = fs.readdirSync(quizDir, { recursive: true }).filter(f => f.endsWith('.png'));
    if (files.length >= 5) { // pelo menos 5 imagens (banner + perguntas/respostas)
      found = { quiz, dir: quizDir, imageCount: files.length };
      break;
    }
  }
}

if (found) {
  const info = {
    id: found.quiz.id,
    original_title: found.quiz.original_title,
    new_title: found.quiz.new_title,
    score: found.quiz.score,
    review: JSON.parse(found.quiz.review_json),
    image_count: found.imageCount
  };

  fs.writeFileSync('_comparison_data.json', JSON.stringify(info, null, 2));
  console.log(`\n✅ Encontrado: ${found.quiz.id}`);
  console.log(`Original: ${found.quiz.original_title}`);
  console.log(`Refatorado: ${found.quiz.new_title}`);
  console.log(`Imagens: ${found.imageCount}`);
  console.log('\nDados salvos');
} else {
  console.log('Nenhum quiz com imagens encontrado');
}
