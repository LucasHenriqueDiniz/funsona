const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('quiz-review.db', { readonly: true });

// Pick refactored quizzes that have images
const quizzes = db.prepare(`
  SELECT * FROM quiz_reviews
  WHERE status = 'refactored'
  ORDER BY id
`).all();

console.log(`Total quizzes: ${quizzes.length}`);

let found = null;
for (const quiz of quizzes) {
  const quizDir = path.join('./refactored-quizzes', quiz.id);
  if (fs.existsSync(quizDir)) {
    const files = fs.readdirSync(quizDir, { recursive: true }).filter(f => f.endsWith('.png'));
    if (files.length >= 5) { // at least 5 images (banner + questions/answers)
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
  console.log(`\n✅ Found: ${found.quiz.id}`);
  console.log(`Original: ${found.quiz.original_title}`);
  console.log(`Refactored: ${found.quiz.new_title}`);
  console.log(`Images: ${found.imageCount}`);
  console.log('\nData saved');
} else {
  console.log('No quiz with images found');
}
