const db = require('../server/db');
async function check() {
  const res = await db.query("SELECT id, full_name FROM attempts WHERE id::text LIKE '81c92110%' OR id::text LIKE 'ae9f8ad1%';");
  console.log('Matches in DB:', res.rows);
  process.exit(0);
}
check();
