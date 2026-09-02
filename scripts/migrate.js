const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function migrate() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:abc@127.0.0.1:5432/quiz_tung_thien';
  const urlObj = new URL(dbUrl);
  const targetDbName = urlObj.pathname.replace('/', '') || 'quiz_tung_thien';

  console.log(`[Migration] Bắt đầu migration cho database: ${targetDbName}...`);

  // Bước 1: Kết nối tới database mặc định (postgres) để kiểm tra/tạo database đích
  const adminClient = new Client({
    host: urlObj.hostname,
    port: urlObj.port || 5432,
    user: urlObj.username,
    password: urlObj.password,
    database: 'postgres'
  });

  try {
    await adminClient.connect();
    const checkDbRes = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1;',
      [targetDbName]
    );

    if (checkDbRes.rowCount === 0) {
      console.log(`[Migration] Database "${targetDbName}" chưa tồn tại. Đang tiến hành tạo...`);
      await adminClient.query(`CREATE DATABASE "${targetDbName}";`);
      console.log(`[Migration] Tạo database "${targetDbName}" thành công.`);
    } else {
      console.log(`[Migration] Database "${targetDbName}" đã tồn tại.`);
    }
  } catch (err) {
    console.error('[Migration] Lỗi khi kiểm tra/tạo database:', err.message);
    throw err;
  } finally {
    await adminClient.end();
  }

  // Bước 2: Kết nối trực tiếp vào database đích và thực thi schema.sql
  const targetClient = new Client({
    connectionString: dbUrl
  });

  try {
    await targetClient.connect();
    const schemaPath = path.join(__dirname, '../server/db/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log(`[Migration] Đang áp dụng schema từ ${schemaPath}...`);
    await targetClient.query(schemaSql);
    console.log('[Migration] Áp dụng schema.sql thành công.');

    // Kiểm tra số lượng bảng đã tạo
    const tablesRes = await targetClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('[Migration] Các bảng hiện có trong database:', tablesRes.rows.map(r => r.table_name));

    // Kiểm tra trạng thái hiện tại
    const stateRes = await targetClient.query('SELECT * FROM quiz_state WHERE id = 1;');
    console.log('[Migration] Trạng thái cuộc thi:', stateRes.rows[0]);

  } catch (err) {
    console.error('[Migration] Lỗi khi thực thi schema:', err.message);
    throw err;
  } finally {
    await targetClient.end();
  }

  console.log('[Migration] Hoàn tất quá trình migration!');
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrate;
