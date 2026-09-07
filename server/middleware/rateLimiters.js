const rateLimit = require('express-rate-limit');
require('dotenv').config();

const LOAD_TEST_SECRET = process.env.LOAD_TEST_SECRET || 'LOAD_TEST_SECRET_2025';

function skipIfLoadTest(req) {
  return req.headers['x-load-test-token'] === LOAD_TEST_SECRET;
}

/**
 * Rate limiter cho API bắt đầu làm bài thi (/api/start)
 * Thiết kế cho hội trường: hỗ trợ hàng trăm thí sinh bấm vào thi cùng lúc trên cùng 1 mạng Wi-Fi (chung IP NAT)
 */
const startLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 2000, // Tối đa 2.000 lượt tạo bài / phút / IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipIfLoadTest,
  message: {
    error: 'Hệ thống đang tiếp nhận nhiều lượt truy cập cùng lúc. Vui lòng thử lại sau vài giây.',
    code: 'RATE_LIMIT_START'
  }
});

/**
 * Rate limiter cho API cập nhật tiến độ chọn câu (/api/progress)
 * Hỗ trợ 200+ thí sinh cùng chọn đáp án liên tục phục vụ bảng Đua Top máy chiếu
 */
const progressLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 10000, // Tối đa 10.000 request / phút / IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipIfLoadTest,
  message: {
    error: 'Thao tác chọn câu quá nhanh.',
    code: 'RATE_LIMIT_PROGRESS'
  }
});

/**
 * Rate limiter cho API nộp bài thi (/api/submit)
 * Hỗ trợ toàn bộ hội trường nộp bài đồng thời khi hết giờ hoặc hoàn thành bài thi
 */
const submitLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 2000, // Tối đa 2.000 lượt submit / phút / IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipIfLoadTest,
  message: {
    error: 'Hệ thống đang xử lý nhiều lượt nộp bài cùng lúc. Vui lòng bấm nộp lại sau vài giây.',
    code: 'RATE_LIMIT_SUBMIT'
  }
});

/**
 * Rate limiter cho API theo dõi màn hình Live (/api/live)
 * Hỗ trợ nhiều màn hình / thiết bị cùng theo dõi thời gian thực
 */
const liveLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 1000, // Tối đa 1.000 request / phút / IP
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
  progressLimiter,
  submitLimiter,
  liveLimiter,
  LOAD_TEST_SECRET
};
