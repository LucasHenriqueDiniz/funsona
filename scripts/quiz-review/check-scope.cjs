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

console.log('=== FILA DE IMAGENS ===');
console.log('Total de itens: ' + queueTotal);
console.log('Quizzes únicos na fila: ' + queueQuizzes);
console.log('Imagens geradas (done): ' + queueDone);
console.log('');
console.log('=== QUIZZES COM IMAGENS ===');
console.log('Quizzes com pasta: ' + quizzesWithImages);
console.log('');
console.log('CONCLUSÃO:');
console.log('Está gerando imagens para ' + queueQuizzes + ' quizzes específicos');
console.log('(não para todos os 769 quizzes do projeto)');
