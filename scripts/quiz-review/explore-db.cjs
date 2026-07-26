const Database = require('better-sqlite3');
const db = new Database('quiz-review.db', { readonly: true });

// Listar tabelas
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tabelas:');
tables.forEach(t => console.log('  - ' + t.name));

// Amostra de dados da primeira tabela
if (tables.length > 0) {
  const tableName = tables[0].name;
  const sample = db.prepare(`SELECT * FROM \`${tableName}\` LIMIT 1`).all();
  console.log(`\nAmostra de ${tableName}:`);
  if (sample.length > 0) {
    console.log(JSON.stringify(sample[0], null, 2));
  }
}
