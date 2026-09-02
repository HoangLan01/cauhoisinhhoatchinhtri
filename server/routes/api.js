const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const stateService = require('../services/stateService');
const quizService = require('../services/quizService');

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
 * Đăng ký và bắt đầu lượt thi mới
 */
router.post('/start', async (req, res, next) => {
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
 * Nộp bài thi
 */
router.post('/submit', async (req, res, next) => {
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
 * Dữ liệu phục vụ màn hình trình chiếu trực tiếp hội trường 16:9
 */
router.get('/live', async (req, res, next) => {
  try {
    const liveData = await quizService.getLiveDashboard();
    res.json(liveData);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
