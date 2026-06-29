const fs = require('fs');

const raw = fs.readFileSync('backups/achievements.json','utf8').replace(/^\uFEFF/,'');
const parsed = JSON.parse(raw);
const rows = parsed.value ?? parsed;

const vals = rows.map(a => {
  const name = (a.name ?? '').replace(/'/g, "''");
  const desc = (a.description ?? '').replace(/'/g, "''");
  const icon = (a.icon ?? '').replace(/'/g, "''");
  const xp = a.xp_reward ?? 0;
  const condType = (a.condition_type ?? 'default').replace(/'/g, "''");
  const condVal = a.condition_value ?? 0;
  return `('${a.id}', '${name}', '${desc}', '${icon}', ${xp}, '${condType}', ${condVal})`;
}).join(',\n');

const sql = `INSERT INTO achievements (id, name, description, icon, xp_reward, condition_type, condition_value) VALUES\n${vals};`;
fs.writeFileSync('temp_achievements.sql', sql);
console.log('SQL written to temp_achievements.sql');
