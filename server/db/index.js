const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:abc@127.0.0.1:5432/quiz_tung_thien';

const pool = new Pool({
  connectionString,
  max: parseInt(process.env.DB_POOL_MAX || '25', 10), // Hỗ trợ 25 kết nối đồng thời phục vụ tải cao
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]', err.message);
});

/**
 * Thực thi câu lệnh SQL parameterized
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production' && duration > 50) {
    console.log(`[DB Query Slow] (${duration}ms): ${text.slice(0, 100)}...`);
  }
  return res;
}

/**
 * Lấy client riêng lẻ từ pool
 */
function getClient() {
  return pool.connect();
}

/**
 * Thực thi transaction an toàn
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
  getClient,
  withTransaction
};
