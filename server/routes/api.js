const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const stateService = require('../services/stateService');
const quizService = require('../services/quizService');
const { startLimiter, progressLimiter, submitLimiter, liveLimiter } = require('../middleware/rateLimiters');

// Tải danh sách đơn vị công tác
let organizationsList = [];
try {
  const orgPath = path.join(__dirname, '../data/organizations.json');
  if (fs.existsSync(orgPath)) {
    organizationsList = JSON.parse(fs.readFileSync(orgPath, 'utf8'));
  }
} catch (e) {
  console.error('[ApiRoute] Lỗi đọc organizations.json:', e.message);
}

/**
 * GET /api/organizations
 * Danh mục đơn vị công tác chuẩn
 */
router.get('/organizations', (req, res) => {
  res.json(organizationsList);
});

/**
 * GET /api/status
 * Trạng thái cuộc thi
 */
router.get('/status', async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const stateInfo = await stateService.getQuizState();
    res.json({
      state: stateInfo.state,
      title: stateInfo.title,
      updatedAt: stateInfo.updatedAt
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/start
 * Đăng ký và bắt đầu lượt thi mới (Rate limited: 15 req/phút/IP)
 */
router.post('/start', startLimiter, async (req, res, next) => {
  try {
    const { fullName, organization } = req.body || {};
    const clientFingerprint = req.headers['user-agent'] || null;

    const attempt = await quizService.startAttempt({
      fullName,
      organization,
      clientFingerprint
    });

    res.status(201).json(attempt);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/progress
 * Cập nhật tiến độ làm từng câu hỏi thời gian thực (phục vụ bảng Đua Top máy chiếu)
 */
router.post('/progress', progressLimiter, async (req, res, next) => {
  try {
    const { attemptId, questionId, selected } = req.body || {};
    const progress = await quizService.updateProgress({
      attemptId,
      questionId,
      selectedOption: selected
    });
    res.json(progress);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/attempt/:id
 * Khôi phục lượt thi khi F5/refresh trình duyệt
 */
router.get('/attempt/:id', async (req, res, next) => {
  try {
    const attempt = await quizService.getAttempt(req.params.id);
    res.json(attempt);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/submit
 * Nộp bài thi (Rate limited: 10 req/phút/IP)
 */
router.post('/submit', submitLimiter, async (req, res, next) => {
  try {
    const { attemptId, answers } = req.body || {};
    const result = await quizService.submitAttempt(attemptId, answers);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/result/:id
 * Kết quả chi tiết và xếp hạng của thí sinh
 */
router.get('/result/:id', async (req, res, next) => {
  try {
    const result = await quizService.getAttemptResult(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/live
 * Dữ liệu phục vụ màn hình trình chiếu trực tiếp hội trường 16:9 (Rate limited: 120 req/phút/IP)
 */
router.get('/live', liveLimiter, async (req, res, next) => {
  try {
    const liveData = await quizService.getLiveDashboard();
    res.json(liveData);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
