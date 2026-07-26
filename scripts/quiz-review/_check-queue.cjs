const Database = require('better-sqlite3');
const db = new Database('image-queue.db', { readonly: true });
const rows = db.prepare("SELECT id, quiz_id, item_type, status, visual_style FROM image_queue WHERE status='pending' ORDER BY id DESC LIMIT 20").all();
console.log(JSON.stringify(rows, null, 2));
const counts = db.prepare("SELECT status, COUNT(*) c FROM image_queue GROUP BY status").all();
console.log(JSON.stringify(counts, null, 2));
