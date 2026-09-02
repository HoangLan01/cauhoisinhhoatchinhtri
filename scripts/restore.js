const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
require('dotenv').config();

const dbUri = process.env.DATABASE_URL || 'postgresql://postgres:abc@127.0.0.1:5432/quiz_tung_thien';

const targetFile = process.argv[2];
if (!targetFile) {
  console.error('[Restore] Vui lòng chỉ định tệp sao lưu .sql cần phục hồi.');
  console.log('Ví dụ: node scripts/restore.js backups/quiz_tung_thien_backup_20250101_120000.sql');
  process.exit(1);
}

const resolvedPath = path.resolve(targetFile);
if (!fs.existsSync(resolvedPath)) {
  console.error(`[Restore] Không tìm thấy tệp: ${resolvedPath}`);
  process.exit(1);
}

console.log(`[Restore] Bắt đầu phục hồi cơ sở dữ liệu từ: ${resolvedPath}...`);

let psqlBin = 'psql';
const winPsql = 'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe';
if (process.platform === 'win32' && fs.existsSync(winPsql)) {
  psqlBin = winPsql;
}

try {
  execFileSync(psqlBin, ['-d', dbUri, '-f', resolvedPath], { stdio: 'inherit' });

  console.log(`[Restore] Phục hồi cơ sở dữ liệu THÀNH CÔNG!`);
} catch (err) {
  console.error(`[Restore] Lỗi khi thực hiện psql restore:`, err.message);
  process.exit(1);
}
