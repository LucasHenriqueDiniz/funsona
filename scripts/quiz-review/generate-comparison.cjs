const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('quiz-review.db', { readonly: true });

// Pegar um quiz refatorado que tem imagens
const quiz = db.prepare(`
  SELECT * FROM quiz_reviews
  WHERE status = 'refactored'
  ORDER BY id
  LIMIT 1
`).get();

if (!quiz) {
  console.log('Nenhum quiz refatorado encontrado');
  process.exit(1);
}

console.log('Quiz ID:', quiz.id);
console.log('Original:', quiz.original_title);
console.log('Refatorado:', quiz.new_title);

// Verificar se tem imagens
const quizDir = path.join('./refactored-quizzes', quiz.id);
if (!fs.existsSync(quizDir)) {
  console.log('Pasta de imagens não encontrada:', quizDir);
} else {
  const files = fs.readdirSync(quizDir, { recursive: true });
  console.log('Arquivos:', files.length);
}

// Salvar info para o script HTML
const info = {
  id: quiz.id,
  original_title: quiz.original_title,
  new_title: quiz.new_title,
  review: JSON.parse(quiz.review_json),
  has_images: fs.existsSync(quizDir)
};

fs.writeFileSync('_comparison_data.json', JSON.stringify(info, null, 2));
console.log('\nDados salvos em _comparison_data.json');
