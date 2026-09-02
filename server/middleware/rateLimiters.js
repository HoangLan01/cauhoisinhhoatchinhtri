const rateLimit = require('express-rate-limit');
require('dotenv').config();

const LOAD_TEST_SECRET = process.env.LOAD_TEST_SECRET || 'LOAD_TEST_SECRET_2025';

function skipIfLoadTest(req) {
  return req.headers['x-load-test-token'] === LOAD_TEST_SECRET;
}

/**
 * Rate limiter cho API bắt đầu làm bài thi (/api/start)
 * Giới hạn: tối đa 15 lượt tạo bài / phút / IP để chống spam bot
 */
const startLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipIfLoadTest,
  message: {
    error: 'Bạn đang thao tác quá nhanh. Vui lòng chờ 1 phút trước khi bắt đầu lại.',
    code: 'RATE_LIMIT_START'
  }
});

/**
 * Rate limiter cho API nộp bài thi (/api/submit)
 * Giới hạn: tối đa 10 lượt submit / phút / IP
 */
const submitLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipIfLoadTest,
  message: {
    error: 'Bạn đang gửi yêu cầu nộp bài quá nhanh. Vui lòng đợi trong giây lát.',
    code: 'RATE_LIMIT_SUBMIT'
  }
});

/**
 * Rate limiter cho API theo dõi màn hình Live (/api/live)
 * Giới hạn: tối đa 120 request / phút / IP (đáp ứng chu kỳ polling 2s = 30 req/phút của hội trường)
 */
const liveLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipIfLoadTest,
  message: {
    error: 'Lượng truy vấn màn hình trực tiếp vượt quá mức cho phép.',
    code: 'RATE_LIMIT_LIVE'
  }
});

module.exports = {
  startLimiter,
  submitLimiter,
  liveLimiter,
  LOAD_TEST_SECRET
};
