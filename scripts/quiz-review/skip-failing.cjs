const Database = require('better-sqlite3');
const db = new Database('image-queue.db');

const r1 = db.prepare('UPDATE image_queue SET status="skipped" WHERE status="pending"').run();
const r2 = db.prepare('UPDATE image_queue SET status="skipped" WHERE status="failed"').run();

console.log('Ignoradas:');
console.log('  Pending → skipped: ' + r1.changes);
console.log('  Failed → skipped: ' + r2.changes);
console.log('');

// Status final
const stats = db.prepare('SELECT status, COUNT(*) c FROM image_queue GROUP BY status ORDER BY status').all();
console.log('=== FINAL ===');
stats.forEach(s => console.log(s.status + ': ' + s.c));

const done = stats.find(s => s.status === 'done')?.c || 0;
const total = db.prepare('SELECT COUNT(*) c FROM image_queue').get().c;
console.log('');
console.log('✅ ' + done + '/' + total + ' = ' + Math.round(done/total*100) + '% completo');
