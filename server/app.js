const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// CORS configuration
app.use(cors());

// Body parsers with safe payload limits
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Simple logger in development
if (!isProd) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// Serve static assets from public folder
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'quiz-tung-thien'
  });
});

const cookieParser = require('cookie-parser');

// Cookie parser with session secret
app.use(cookieParser(process.env.SESSION_SECRET || 'dev_secret_key_phuong_tung_thien_2025'));

// Business API routes
const apiRoutes = require('./routes/api');
const controlRoutes = require('./routes/control');
app.use('/api/control', controlRoutes);
app.use('/api', apiRoutes);

// 404 handler for API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler - never leaks stack trace in production
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    error: isProd ? 'Internal Server Error' : (err.message || 'Lỗi hệ thống')
  });
});

// Start listening if run directly
let server;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  Hệ thống Quiz Phường Tùng Thiện đang hoạt động`);
    console.log(`  Môi trường: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Địa chỉ: http://localhost:${PORT}`);
    console.log(`  Kiểm tra sức khỏe: http://localhost:${PORT}/health`);
    console.log(`====================================================`);
  });
}

module.exports = { app, server };
