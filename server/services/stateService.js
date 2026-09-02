const db = require('../db');

let cachedState = null;
let lastFetchedAt = 0;
const CACHE_TTL_MS = 1000; // Cache 1 giây để tối ưu cho 300-500 CCU

/**
 * Lấy trạng thái cuộc thi hiện tại từ database
 */
async function getQuizState(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedState && (now - lastFetchedAt < CACHE_TTL_MS)) {
    return cachedState;
  }

  const res = await db.query('SELECT id, state, title, updated_at FROM quiz_state WHERE id = 1;');
  if (res.rowCount === 0) {
    // Nếu chưa có, tạo mặc định
    await db.query(`
      INSERT INTO quiz_state (id, state, title, updated_at)
      VALUES (1, 'RUNNING', 'Hội thi Trắc nghiệm Kiến thức — Phường Tùng Thiện', CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO NOTHING;
    `);
    cachedState = {
      state: 'RUNNING',
      title: 'Hội thi Trắc nghiệm Kiến thức — Phường Tùng Thiện',
      updatedAt: new Date()
    };
  } else {
    const row = res.rows[0];
    cachedState = {
      state: row.state,
      title: row.title,
      updatedAt: row.updated_at
    };
  }

  lastFetchedAt = now;
  return cachedState;
}

/**
 * Cập nhật trạng thái cuộc thi
 */
async function setQuizState(newState) {
  const validStates = ['WAITING', 'RUNNING', 'CLOSED', 'RESULT'];
  const upperState = String(newState).trim().toUpperCase();

  if (!validStates.includes(upperState)) {
    throw new Error(`Trạng thái không hợp lệ: "${newState}". Cho phép: ${validStates.join(', ')}`);
  }

  const res = await db.query(`
    UPDATE quiz_state 
    SET state = $1, updated_at = CURRENT_TIMESTAMP 
    WHERE id = 1 
    RETURNING state, title, updated_at;
  `, [upperState]);

  const row = res.rows[0];
  cachedState = {
    state: row.state,
    title: row.title,
    updatedAt: row.updated_at
  };
  lastFetchedAt = Date.now();

  console.log(`[StateService] Trạng thái cuộc thi đã chuyển sang: ${upperState}`);
  return cachedState;
}

module.exports = {
  getQuizState,
  setQuizState
};
