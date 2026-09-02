const express = require('express');
const router = express.Router();
const db = require('../db');
const stateService = require('../services/stateService');
const questionService = require('../services/questionService');
const {
  createSessionToken,
  requireControlAuth,
  loginRateLimiter,
  recordFailedLogin,
  recordSuccessfulLogin
} = require('../middleware/auth');

const CONTROL_PASSWORD = process.env.CONTROL_PASSWORD || 'tungthien2025';
const isProd = process.env.NODE_ENV === 'production';

/**
 * POST /api/control/login
 * Đăng nhập Ban Tổ chức
 */
router.post('/login', loginRateLimiter, (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown-ip';
  const { password } = req.body || {};

  if (!password || String(password).trim() !== CONTROL_PASSWORD) {
    recordFailedLogin(ip);
    return res.status(401).json({
      error: 'Mật khẩu quản trị không chính xác',
      code: 'INVALID_CREDENTIALS'
    });
  }

  recordSuccessfulLogin(ip);
  const token = createSessionToken('admin');

  // Cấp HttpOnly Cookie an toàn
  res.cookie('control_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 12 * 60 * 60 * 1000 // 12 giờ
  });

  return res.json({
    success: true,
    message: 'Đăng nhập thành công',
    token
  });
});

/**
 * POST /api/control/logout
 * Đăng xuất
 */
router.post('/logout', (req, res) => {
  res.clearCookie('control_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax'
  });
  res.json({
    success: true,
    message: 'Đã đăng xuất thành công'
  });
});

/**
 * GET /api/control/me
 * Kiểm tra trạng thái phiên đăng nhập
 */
router.get('/me', requireControlAuth, (req, res) => {
  res.json({
    authenticated: true,
    role: req.adminUser.role
  });
});

/**
 * POST /api/control/state
 * Chuyển trạng thái cuộc thi (WAITING / RUNNING / CLOSED / RESULT)
 */
router.post('/state', requireControlAuth, async (req, res, next) => {
  try {
    const { state } = req.body || {};
    if (!state) {
      return res.status(400).json({ error: 'Thiếu trường trạng thái state' });
    }

    const updated = await stateService.setQuizState(state);
    res.json({
      success: true,
      state: updated.state,
      title: updated.title,
      updatedAt: updated.updatedAt
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/control/stats
 * Thống kê quản trị nâng cao
 */
router.get('/stats', requireControlAuth, async (req, res, next) => {
  try {
    const stateInfo = await stateService.getQuizState();

    const statsSql = `
      SELECT 
        COUNT(*) AS registered,
        COUNT(*) FILTER (WHERE status = 'SUBMITTED') AS completed,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS playing,
        ROUND(AVG(score) FILTER (WHERE status = 'SUBMITTED'), 1) AS avg_score,
        MAX(score) FILTER (WHERE status = 'SUBMITTED') AS max_score,
        COUNT(*) FILTER (WHERE status = 'SUBMITTED' AND score = 20) AS perfect_score_count,
        ROUND(AVG(duration_ms) FILTER (WHERE status = 'SUBMITTED')) AS avg_duration_ms
      FROM attempts;
    `;

    const statsRes = await db.query(statsSql);
    const row = statsRes.rows[0];

    const reg = Number(row.registered) || 0;
    const comp = Number(row.completed) || 0;

    res.json({
      state: stateInfo.state,
      title: stateInfo.title,
      registered: reg,
      playing: Number(row.playing) || 0,
      completed: comp,
      completionRate: reg > 0 ? Number(((comp / reg) * 100).toFixed(1)) : 0,
      avgScore: Number(row.avg_score) || 0,
      maxScore: Number(row.max_score) || 0,
      perfectCount: Number(row.perfect_score_count) || 0,
      avgDurationMs: Number(row.avg_duration_ms) || 0,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/control/export và /api/control/export.csv
 * Xuất dữ liệu kết quả bảng xếp hạng định dạng CSV kèm UTF-8 BOM
 */
router.get(['/export', '/export.csv'], requireControlAuth, async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        full_name,
        organization,
        score,
        duration_ms,
        started_at,
        submitted_at
      FROM attempts
      WHERE status = 'SUBMITTED'
      ORDER BY score DESC, duration_ms ASC, submitted_at ASC;
    `;

    const dbRes = await db.query(sql);
    const totalQuestions = questionService.getTotalQuestionsCount();

    // UTF-8 BOM (\uFEFF) giúp Microsoft Excel hiển thị đúng dấu tiếng Việt
    let csv = '\uFEFF';

    // Tiêu đề các cột CSV
    csv += 'Hạng,Họ và tên,Đơn vị công tác,Điểm số,Tổng số câu,Thời gian làm bài,Thời điểm bắt đầu,Thời điểm nộp bài\r\n';

    dbRes.rows.forEach((row, index) => {
      const rank = index + 1;
      const fullName = escapeCsvField(row.full_name);
      const organization = escapeCsvField(row.organization);
      const score = row.score;
      const durationFormatted = formatDuration(row.duration_ms);
      const startedAt = row.started_at ? new Date(row.started_at).toLocaleString('vi-VN') : '';
      const submittedAt = row.submitted_at ? new Date(row.submitted_at).toLocaleString('vi-VN') : '';

      csv += `${rank},${fullName},${organization},${score},${totalQuestions},"${durationFormatted}","${startedAt}","${submittedAt}"\r\n`;
    });

    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const filename = `ket_qua_hoi_thi_tung_thien_${timestamp}.csv`;

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(filename);
    res.send(Buffer.from(csv, 'utf8'));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/control/reset
 * Thiết lập lại dữ liệu cuộc thi (Danger Zone)
 */
router.post('/reset', requireControlAuth, async (req, res, next) => {
  try {
    const { confirmation } = req.body || {};

    if (String(confirmation).trim() !== 'RESET') {
      return res.status(400).json({
        error: 'Từ khóa xác nhận không đúng. Vui lòng nhập chính xác chữ "RESET" để thực hiện.',
        code: 'INVALID_CONFIRMATION'
      });
    }

    await db.withTransaction(async (client) => {
      // Xóa toàn bộ dữ liệu bảng attempts
      await client.query('DELETE FROM attempts;');
    });

    // Đưa trạng thái về WAITING và cập nhật cache tức thì
    await stateService.setQuizState('WAITING');

    console.warn('[Admin Action] Toàn bộ dữ liệu cuộc thi đã được thiết lập lại (RESET) về trạng thái WAITING.');

    res.json({
      success: true,
      message: 'Đã xóa toàn bộ dữ liệu cuộc thi và đưa hệ thống về trạng thái Chờ (WAITING).'
    });
  } catch (err) {
    next(err);
  }
});

// Helper định dạng chuỗi CSV an toàn
function escapeCsvField(field) {
  if (!field) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

// Helper định dạng thời gian mm:ss
function formatDuration(durationMs) {
  if (!durationMs || durationMs < 0) return '00:00';
  const totalSeconds = Math.round(durationMs / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

module.exports = router;
