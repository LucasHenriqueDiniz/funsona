const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('quiz-review.db', { readonly: true });

// Pick a refactored quiz that has images
const quiz = db.prepare(`
  SELECT * FROM quiz_reviews
  WHERE status = 'refactored'
  ORDER BY id
  LIMIT 1
`).get();

if (!quiz) {
  console.log('No refactored quiz found');
  process.exit(1);
}

console.log('Quiz ID:', quiz.id);
console.log('Original:', quiz.original_title);
console.log('Refactored:', quiz.new_title);

// Check whether it has images
const quizDir = path.join('./refactored-quizzes', quiz.id);
if (!fs.existsSync(quizDir)) {
  console.log('Image directory not found:', quizDir);
} else {
  const files = fs.readdirSync(quizDir, { recursive: true });
  console.log('Files:', files.length);
}

// Save the info for the HTML script
const info = {
  id: quiz.id,
  original_title: quiz.original_title,
  new_title: quiz.new_title,
  review: JSON.parse(quiz.review_json),
  has_images: fs.existsSync(quizDir)
};

fs.writeFileSync('_comparison_data.json', JSON.stringify(info, null, 2));
console.log('\nData saved to _comparison_data.json');
