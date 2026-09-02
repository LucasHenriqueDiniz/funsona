const Database = require('better-sqlite3');
const fs = require('fs');

const db = new Database('image-queue.db', { readonly: true });

const queueTotal = db.prepare('SELECT COUNT(*) c FROM image_queue').get().c;
const queueQuizzes = db.prepare('SELECT COUNT(DISTINCT quiz_id) c FROM image_queue').get().c;
const queueDone = db.prepare("SELECT COUNT(*) c FROM image_queue WHERE status = 'done'").get().c;

const refactDir = './refactored-quizzes';
const quizzesWithImages = fs.existsSync(refactDir)
  ? fs.readdirSync(refactDir).filter(f => {
      try { return fs.statSync('./refactored-quizzes/' + f).isDirectory(); } catch { return false; }
    }).length
  : 0;

console.log('=== IMAGE QUEUE ===');
console.log('Total items: ' + queueTotal);
console.log('Distinct quizzes in the queue: ' + queueQuizzes);
console.log('Images generated (done): ' + queueDone);
console.log('');
console.log('=== QUIZZES WITH IMAGES ===');
console.log('Quizzes with a directory: ' + quizzesWithImages);
console.log('');
console.log('CONCLUSION:');
console.log('It is generating images for ' + queueQuizzes + ' specific quizzes');
console.log('(not for all 769 quizzes in the project)');
