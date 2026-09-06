const path = require('path');
const fs = require('fs');
const db = require('../db');
const questionService = require('./questionService');
const stateService = require('./stateService');

// Tải danh sách đơn vị công tác chuẩn
let validOrganizations = [];
try {
  const orgPath = path.join(__dirname, '../data/organizations.json');
  if (fs.existsSync(orgPath)) {
    validOrganizations = JSON.parse(fs.readFileSync(orgPath, 'utf8'));
  }
} catch (e) {
  console.error('[QuizService] Lỗi đọc organizations.json:', e.message);
}

// Regex kiểm tra UUID hợp lệ (chuẩn 8-4-4-4-12 hex)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

/**
 * Bắt đầu một lượt thi mới (Khóa 01 người chỉ 01 lượt thi)
 */
async function startAttempt({ fullName, organization, clientFingerprint = null }) {
  const stateInfo = await stateService.getQuizState();

  if (stateInfo.state !== 'RUNNING') {
    const err = new Error(`Cuộc thi hiện không ở trạng thái mở làm bài (Trạng thái: ${stateInfo.state})`);
    err.status = 403;
    throw err;
  }

  const cleanName = (fullName || '').trim();
  const cleanOrg = (organization || '').trim();

  if (!cleanName || cleanName.length < 2 || cleanName.length > 100) {
    const err = new Error('Họ và tên thí sinh không hợp lệ (từ 2 đến 100 ký tự)');
    err.status = 400;
    throw err;
  }

  // Chống XSS / HTML Injection trong Họ và tên
  if (/[<>]|script|javascript:/i.test(cleanName)) {
    const err = new Error('Họ và tên chứa ký tự không hợp lệ');
    err.status = 400;
    throw err;
  }

  if (!cleanOrg || cleanOrg.length < 2 || cleanOrg.length > 150) {
    const err = new Error('Đơn vị công tác không hợp lệ (từ 2 đến 150 ký tự)');
    err.status = 400;
    throw err;
  }

  // Xác thực đơn vị công tác phải nằm trong danh mục chính thức nếu danh mục có sẵn
  if (validOrganizations.length > 0 && !validOrganizations.includes(cleanOrg)) {
    const err = new Error('Đơn vị công tác không nằm trong danh mục hợp lệ của phường Tùng Thiện');
    err.status = 400;
    throw err;
  }

  // KHÓA 01 LẦN THI: Kiểm tra xem thí sinh (Họ tên + Đơn vị) đã từng đăng ký tham gia chưa
  const checkDuplicateSql = `
    SELECT id, full_name, organization, status, started_at
    FROM attempts
    WHERE LOWER(TRIM(full_name)) = LOWER(TRIM($1))
      AND organization = $2
    LIMIT 1;
  `;
  const dupRes = await db.query(checkDuplicateSql, [cleanName, cleanOrg]);

  if (dupRes.rowCount > 0) {
    const existing = dupRes.rows[0];
    const isSubmitted = existing.status === 'SUBMITTED';
    const msg = isSubmitted
      ? `Thí sinh "${cleanName}" thuộc "${cleanOrg}" đã hoàn thành bài thi trước đó. Mỗi thí sinh chỉ được tham gia 01 lần duy nhất!`
      : `Thí sinh "${cleanName}" thuộc "${cleanOrg}" đã có bài thi đang diễn ra. Mỗi thí sinh chỉ được tham gia 01 lần duy nhất!`;
    
    const err = new Error(msg);
    err.status = 409; // Conflict
    err.existingAttemptId = existing.id;
    err.existingStatus = existing.status;
    throw err;
  }

  // Thêm mới lượt thi vào PostgreSQL với started_at do máy chủ xác định
  const insertSql = `
    INSERT INTO attempts (
      full_name, 
      organization, 
      client_fingerprint, 
      status, 
      current_score, 
      answered_count, 
      last_active_at, 
      started_at
    )
    VALUES ($1, $2, $3, 'IN_PROGRESS', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id, full_name, organization, started_at, status;
  `;

  const res = await db.query(insertSql, [cleanName, cleanOrg, clientFingerprint]);
  const row = res.rows[0];

  return {
    attemptId: row.id,
    fullName: row.full_name,
    organization: row.organization,
    startedAt: row.started_at,
    totalQuestions: questionService.getTotalQuestionsCount(),
    maxScore: questionService.getTotalQuestionsCount() * 10,
    questions: questionService.getSanitizedQuestions() // Tuyệt đối không chứa correct/explanation
  };
}

/**
 * Cập nhật tiến độ từng câu hỏi trong lúc thi (Phục vụ bảng Đua Top Live thời gian thực)
 */
async function updateProgress({ attemptId, questionId, selectedOption }) {
  if (!attemptId || !isValidUUID(attemptId)) {
    const err = new Error('Mã lượt thi không hợp lệ (yêu cầu định dạng UUID)');
    err.status = 400;
    throw err;
  }

  const stateInfo = await stateService.getQuizState();
  if (stateInfo.state !== 'RUNNING') {
    const err = new Error(`Cuộc thi không ở trạng thái làm bài (Trạng thái: ${stateInfo.state})`);
    err.status = 403;
    throw err;
  }

  const qId = Number(questionId);
  const targetQuestion = questionService.getQuestionById(qId);
  if (!targetQuestion) {
    const err = new Error('Câu hỏi không tồn tại trong hệ thống');
    err.status = 400;
    throw err;
  }

  const cleanOpt = selectedOption ? String(selectedOption).trim().toUpperCase() : null;

  return await db.withTransaction(async (client) => {
    const checkSql = `
      SELECT id, full_name, organization, status, answers 
      FROM attempts 
      WHERE id = $1 
      FOR UPDATE;
    `;
    const checkRes = await client.query(checkSql, [attemptId]);

    if (checkRes.rowCount === 0) {
      const err = new Error('Lượt thi không tồn tại');
      err.status = 404;
      throw err;
    }

    const attempt = checkRes.rows[0];
    if (attempt.status === 'SUBMITTED') {
      return { attemptId, status: 'SUBMITTED' };
    }

    let currentAnswers = attempt.answers || {};
    if (typeof currentAnswers !== 'object' || Array.isArray(currentAnswers)) {
      currentAnswers = {};
    }

    if (cleanOpt) {
      currentAnswers[qId] = cleanOpt;
    } else {
      delete currentAnswers[qId];
    }

    // Tính toán lại điểm số tạm thời và số câu đã làm trên Server (bảo mật tuyệt đối)
    let answeredCount = 0;
    let currentScore = 0;

    for (const [key, val] of Object.entries(currentAnswers)) {
      const q = questionService.getQuestionById(Number(key));
      if (q && val) {
        answeredCount++;
        if (val === q.correct) {
          currentScore += 10;
        }
      }
    }

    const updateSql = `
      UPDATE attempts
      SET 
        answers = $1,
        answered_count = $2,
        current_score = $3,
        last_active_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, answered_count, current_score;
    `;

    const updateRes = await client.query(updateSql, [
      JSON.stringify(currentAnswers),
      answeredCount,
      currentScore,
      attemptId
    ]);

    const updated = updateRes.rows[0];

    return {
      attemptId: updated.id,
      answeredCount: updated.answered_count,
      currentScore: updated.current_score,
      totalQuestions: questionService.getTotalQuestionsCount(),
      maxScore: questionService.getTotalQuestionsCount() * 10
    };
  });
}

/**
 * Lấy thông tin lượt thi để khôi phục (Resume) khi F5/refresh
 */
async function getAttempt(attemptId) {
  if (!attemptId || !isValidUUID(attemptId)) {
    const err = new Error('Mã lượt thi không hợp lệ (yêu cầu định dạng UUID)');
    err.status = 400;
    throw err;
  }

  const res = await db.query(
    'SELECT id, full_name, organization, status, started_at, submitted_at, score, current_score, answered_count, duration_ms, answers FROM attempts WHERE id = $1;',
    [attemptId]
  );

  if (res.rowCount === 0) {
    const err = new Error('Lượt thi không tồn tại');
    err.status = 404;
    throw err;
  }

  const row = res.rows[0];
  const stateInfo = await stateService.getQuizState();

  if (row.status === 'SUBMITTED') {
    return {
      attemptId: row.id,
      status: 'SUBMITTED',
      fullName: row.full_name,
      organization: row.organization,
      startedAt: row.started_at,
      submittedAt: row.submitted_at,
      score: row.score,
      maxScore: questionService.getTotalQuestionsCount() * 10,
      totalQuestions: questionService.getTotalQuestionsCount(),
      durationMs: row.duration_ms,
      serverState: stateInfo.state
    };
  }

  return {
    attemptId: row.id,
    status: 'IN_PROGRESS',
    fullName: row.full_name,
    organization: row.organization,
    startedAt: row.started_at,
    serverState: stateInfo.state,
    currentScore: row.current_score || 0,
    answeredCount: row.answered_count || 0,
    savedAnswers: row.answers || {},
    totalQuestions: questionService.getTotalQuestionsCount(),
    maxScore: questionService.getTotalQuestionsCount() * 10,
    questions: questionService.getSanitizedQuestions()
  };
}

/**
 * Nộp bài thi - Chống Race Condition & Chống Submit kép bằng DB Transaction + FOR UPDATE
 */
async function submitAttempt(attemptId, answers = {}) {
  if (!attemptId || !isValidUUID(attemptId)) {
    const err = new Error('Mã lượt thi không hợp lệ (yêu cầu định dạng UUID)');
    err.status = 400;
    throw err;
  }

  const stateInfo = await stateService.getQuizState();
  if (stateInfo.state !== 'RUNNING') {
    const err = new Error(`Cuộc thi đã đóng nhận bài thi (Trạng thái: ${stateInfo.state})`);
    err.status = 403;
    throw err;
  }

  return await db.withTransaction(async (client) => {
    // 1. Khóa dòng record lượt thi để chống submit đồng thời từ nhiều request song song
    const checkSql = `
      SELECT id, full_name, organization, status, started_at 
      FROM attempts 
      WHERE id = $1 
      FOR UPDATE;
    `;
    const checkRes = await client.query(checkSql, [attemptId]);

    if (checkRes.rowCount === 0) {
      const err = new Error('Lượt thi không tồn tại');
      err.status = 404;
      throw err;
    }

    const attempt = checkRes.rows[0];

    // 2. Kiểm tra đã submit trước đó chưa
    if (attempt.status === 'SUBMITTED') {
      const err = new Error('Lượt thi này đã được nộp bài trước đó. Không thể nộp lại.');
      err.status = 409; // Conflict
      throw err;
    }

    // 3. Tính toán điểm số trên backend từ questions.json nguồn
    const evalResult = questionService.evaluateAnswers(answers);

    // 4. Tính toán thời gian làm bài chính xác từ server time
    const startedAtTime = new Date(attempt.started_at).getTime();
    const nowTime = Date.now();
    const durationMs = Math.max(0, nowTime - startedAtTime);

    // 5. Cập nhật lượt thi thành công
    const updateSql = `
      UPDATE attempts
      SET 
        status = 'SUBMITTED',
        submitted_at = CURRENT_TIMESTAMP,
        score = $1,
        current_score = $1,
        answered_count = $2,
        duration_ms = $3,
        answers = $4,
        last_active_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, full_name, organization, score, duration_ms, submitted_at, status;
    `;

    const updateRes = await client.query(updateSql, [
      evalResult.score,
      evalResult.total,
      durationMs,
      JSON.stringify(evalResult.answersRecord),
      attemptId
    ]);

    const updatedRow = updateRes.rows[0];

    return {
      attemptId: updatedRow.id,
      fullName: updatedRow.full_name,
      organization: updatedRow.organization,
      score: updatedRow.score,
      correctCount: evalResult.correctCount,
      totalQuestions: evalResult.total,
      maxScore: evalResult.maxScore,
      durationMs: Number(updatedRow.duration_ms),
      submittedAt: updatedRow.submitted_at,
      status: updatedRow.status
    };
  });
}

/**
 * Tra cứu kết quả cá nhân và thứ hạng
 */
async function getAttemptResult(attemptId) {
  if (!attemptId || !isValidUUID(attemptId)) {
    const err = new Error('Mã lượt thi không hợp lệ (yêu cầu định dạng UUID)');
    err.status = 400;
    throw err;
  }

  const res = await db.query(
    'SELECT id, full_name, organization, score, duration_ms, submitted_at, status FROM attempts WHERE id = $1;',
    [attemptId]
  );

  if (res.rowCount === 0) {
    const err = new Error('Lượt thi không tồn tại');
    err.status = 404;
    throw err;
  }

  const attempt = res.rows[0];

  if (attempt.status !== 'SUBMITTED') {
    const err = new Error('Lượt thi chưa hoàn thành nộp bài');
    err.status = 400;
    throw err;
  }

  const stateInfo = await stateService.getQuizState();

  // Tính thứ hạng: Score DESC -> duration_ms ASC -> submitted_at ASC
  const rankSql = `
    SELECT COUNT(*) + 1 AS rank
    FROM attempts
    WHERE status = 'SUBMITTED'
      AND (
        score > $1
        OR (score = $1 AND duration_ms < $2)
        OR (score = $1 AND duration_ms = $2 AND submitted_at < $3)
      );
  `;
  const rankRes = await db.query(rankSql, [
    attempt.score,
    attempt.duration_ms,
    attempt.submitted_at
  ]);

  const countSql = `SELECT COUNT(*) AS total_completed FROM attempts WHERE status = 'SUBMITTED';`;
  const countRes = await db.query(countSql);

  const totalQuestions = questionService.getTotalQuestionsCount();

  return {
    attemptId: attempt.id,
    fullName: attempt.full_name,
    organization: attempt.organization,
    score: attempt.score,
    maxScore: totalQuestions * 10,
    totalQuestions: totalQuestions,
    durationMs: Number(attempt.duration_ms),
    rank: Number(rankRes.rows[0]?.rank || 1),
    totalCompleted: Number(countRes.rows[0]?.total_completed || 1),
    submittedAt: attempt.submitted_at,
    state: stateInfo.state
  };
}

/**
 * Thống kê cho màn hình Live (Đua Top trong RUNNING và Vinh danh trong RESULT)
 */
async function getLiveDashboard() {
  const stateInfo = await stateService.getQuizState();

  // Thống kê nhanh tổng số thí sinh
  const statsSql = `
    SELECT 
      COUNT(*) AS registered,
      COUNT(*) FILTER (WHERE status = 'SUBMITTED') AS completed,
      COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS playing
    FROM attempts;
  `;
  const statsRes = await db.query(statsSql);
  const { registered, completed, playing } = statsRes.rows[0];

  const regCount = Number(registered) || 0;
  const compCount = Number(completed) || 0;
  const playCount = Number(playing) || 0;
  const completionRate = regCount > 0 ? Number(((compCount / regCount) * 100).toFixed(1)) : 0;
  const totalQuestions = questionService.getTotalQuestionsCount();
  const maxScore = totalQuestions * 10;

  let top = [];

  if (stateInfo.state === 'RUNNING') {
    // BẢNG ĐUA TOP THỜI GIAN THỰC (LIVE RACE):
    // Ưu tiên:
    // 1. status = 'SUBMITTED' trước
    // 2. Điểm số cao hơn (score/current_score DESC)
    // 3. Số câu đã làm nhiều hơn (answered_count DESC)
    // 4. Thời gian đạt mốc điểm sớm hơn (last_active_at ASC)
    const liveRaceSql = `
      SELECT 
        id,
        full_name,
        organization,
        status,
        COALESCE(score, current_score, 0) AS score,
        COALESCE(answered_count, 0) AS answered_count,
        duration_ms,
        last_active_at,
        submitted_at
      FROM attempts
      ORDER BY 
        COALESCE(score, current_score, 0) DESC,
        COALESCE(answered_count, 0) DESC,
        last_active_at ASC
      LIMIT 15;
    `;
    const liveRes = await db.query(liveRaceSql);

    top = liveRes.rows.map((r, index) => ({
      rank: index + 1,
      id: r.id,
      fullName: r.full_name,
      organization: r.organization,
      status: r.status,
      score: Number(r.score) || 0,
      answeredCount: Number(r.answered_count) || 0,
      totalQuestions: totalQuestions,
      maxScore: maxScore,
      durationMs: r.duration_ms ? Number(r.duration_ms) : null,
      submittedAt: r.submitted_at
    }));
  } else {
    // BẢNG VINH DANH CHÍNH THỨC (RESULT / CLOSED)
    const topSql = `
      SELECT 
        id,
        full_name,
        organization,
        score,
        duration_ms,
        submitted_at
      FROM attempts
      WHERE status = 'SUBMITTED'
      ORDER BY score DESC, duration_ms ASC, submitted_at ASC
      LIMIT 10;
    `;
    const topRes = await db.query(topSql);

    top = topRes.rows.map((r, index) => ({
      rank: index + 1,
      id: r.id,
      fullName: r.full_name,
      organization: r.organization,
      score: Number(r.score) || 0,
      totalQuestions: totalQuestions,
      maxScore: maxScore,
      durationMs: Number(r.duration_ms),
      submittedAt: r.submitted_at
    }));
  }

  return {
    state: stateInfo.state,
    title: stateInfo.title,
    registered: regCount,
    playing: playCount,
    completed: compCount,
    completionRate,
    totalQuestions,
    maxScore,
    top
  };
}

module.exports = {
  startAttempt,
  updateProgress,
  getAttempt,
  submitAttempt,
  getAttemptResult,
  getLiveDashboard
};
