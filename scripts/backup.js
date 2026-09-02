const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
require('dotenv').config();

const dbUri = process.env.DATABASE_URL || 'postgresql://postgres:abc@127.0.0.1:5432/quiz_tung_thien';

const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
const outputFile = path.join(backupDir, `quiz_tung_thien_backup_${timestamp}.sql`);

console.log(`[Backup] Bắt đầu sao lưu cơ sở dữ liệu từ DATABASE_URL...`);

// Tìm đường dẫn pg_dump
let pgDumpBin = 'pg_dump';
const winPgDump = 'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe';
if (process.platform === 'win32' && fs.existsSync(winPgDump)) {
  pgDumpBin = winPgDump;
}

try {
  execFileSync(pgDumpBin, ['-d', dbUri, '-F', 'p', '-f', outputFile], { stdio: 'inherit' });

  const stats = fs.statSync(outputFile);
  console.log(`[Backup] Sao lưu THÀNH CÔNG!`);
  console.log(`[Backup] Tệp sao lưu: ${outputFile}`);
  console.log(`[Backup] Dung lượng: ${(stats.size / 1024).toFixed(2)} KB`);
} catch (err) {
  console.error(`[Backup] Lỗi khi thực hiện pg_dump:`, err.message);
  process.exit(1);
}
