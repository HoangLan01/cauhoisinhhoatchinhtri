const crypto = require('crypto');
require('dotenv').config();

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret_key_phuong_tung_thien_2025';
const TOKEN_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 giờ

// In-memory rate limiting cho đăng nhập Ban Tổ chức
const loginAttempts = new Map(); // IP -> { count: number, lockedUntil: number }
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // Khóa 15 phút

/**
 * Tạo token đã ký bằng HMAC SHA-256
 */
function createSessionToken(role = 'admin') {
  const payload = {
    role,
    exp: Date.now() + TOKEN_EXPIRY_MS,
    nonce: crypto.randomBytes(8).toString('hex')
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadBase64)
    .digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Xác thực token HMAC SHA-256
 */
function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64, providedSignature] = parts;

  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadBase64)
    .digest('base64url');

  // So sánh an toàn tránh timing attack
  if (!crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (Date.now() > payload.exp) {
      return null; // Hết hạn
    }
    return payload;
  } catch (e) {
    return null;
  }
}

/**
 * Middleware bảo vệ các API quản trị Ban Tổ chức
 */
function requireControlAuth(req, res, next) {
  // Lấy token từ cookie hoặc header Authorization
  let token = req.cookies ? req.cookies.control_token : null;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    return res.status(401).json({
      error: 'Yêu cầu đăng nhập quản trị Ban Tổ chức',
      code: 'UNAUTHORIZED'
    });
  }

  req.adminUser = payload;
  next();
}

/**
 * Middleware kiểm tra giới hạn tần suất đăng nhập (Anti Brute-Force)
 */
function loginRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown-ip';
  const now = Date.now();

  const record = loginAttempts.get(ip);
  if (record && record.lockedUntil && now < record.lockedUntil) {
    const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
    return res.status(429).json({
      error: `Bạn đã thử đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${remainingMinutes} phút.`,
      code: 'TOO_MANY_ATTEMPTS'
    });
  }

  next();
}

/**
 * Ghi nhận lần đăng nhập thất bại
 */
function recordFailedLogin(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };

  // Nếu quá hạn khóa cũ, reset lại count
  if (record.lockedUntil && now >= record.lockedUntil) {
    record.count = 0;
    record.lockedUntil = 0;
  }

  record.count += 1;
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCK_TIME_MS;
    console.warn(`[Security Alert] IP ${ip} đã bị tạm khóa đăng nhập trong 15 phút do thử sai 5 lần.`);
  }

  loginAttempts.set(ip, record);
}

/**
 * Xóa bản ghi khi đăng nhập thành công
 */
function recordSuccessfulLogin(ip) {
  loginAttempts.delete(ip);
}

module.exports = {
  createSessionToken,
  verifySessionToken,
  requireControlAuth,
  loginRateLimiter,
  recordFailedLogin,
  recordSuccessfulLogin
};
