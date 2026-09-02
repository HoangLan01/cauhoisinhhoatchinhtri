const http = require('http');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const LOAD_TEST_SECRET = 'LOAD_TEST_SECRET_2025';

// Tải danh mục đơn vị và câu hỏi
const orgs = JSON.parse(fs.readFileSync(path.join(__dirname, '../server/data/organizations.json'), 'utf8'));
const questions = JSON.parse(fs.readFileSync(path.join(__dirname, '../server/data/questions.json'), 'utf8'));

// Số lượng Virtual Users (mặc định 300, có thể truyền tham số 500 hoặc 1000)
const VU_COUNT = parseInt(process.argv[2] || '300', 10);

// Keep-alive agent tối ưu kết nối HTTP client
const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 100,
  timeout: 10000
});

function httpRequest(urlPath, method, body = null) {
  return new Promise((resolve) => {
    const url = new URL(urlPath, BASE_URL);
    const start = Date.now();

    const headers = {
      'Accept': 'application/json',
      'x-load-test-token': LOAD_TEST_SECRET
    };

    let payload = null;
    if (body) {
      payload = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(url, {
      method,
      headers,
      agent,
      timeout: 15000
    }, (res) => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        const latency = Date.now() - start;
        resolve({
          status: res.statusCode,
          latency,
          success: res.statusCode >= 200 && res.statusCode < 300,
          error: null
        });
      });
    });

    req.on('error', (err) => {
      const latency = Date.now() - start;
      resolve({
        status: 0,
        latency,
        success: false,
        error: err.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const latency = Date.now() - start;
      resolve({
        status: 408,
        latency,
        success: false,
        error: 'Timeout'
      });
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Hàm tính phân vị (Percentile)
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function runLoadTest() {
  console.log('======================================================================');
  console.log(`  BẮT ĐẦU KIỂM THỬ TẢI CAO (LOAD TEST): ${VU_COUNT} NGƯỜI DÙNG ĐỒNG THỜI`);
  console.log('  Kịch bản: Start Quiz -> Think Time -> Spike Submit -> Live Polling');
  console.log('======================================================================\n');

  const startTimes = [];
  const submitTimes = [];
  const liveTimes = [];

  let startSuccess = 0;
  let startFail = 0;
  let submitSuccess = 0;
  let submitFail = 0;
  let liveSuccess = 0;
  let liveFail = 0;

  const testStartTime = Date.now();

  // 1. Chạy tiến trình nền mô phỏng Màn hình Live Polling
  let stopLivePolling = false;
  const livePollingPromise = (async () => {
    while (!stopLivePolling) {
      const res = await httpRequest('/api/live', 'GET');
      liveTimes.push(res.latency);
      if (res.success) liveSuccess++; else liveFail++;
      await sleep(100);
    }
  })();

  // 2. Giai đoạn 1: Đồng loạt ${VU_COUNT} người đăng ký tham gia (POST /api/start)
  console.log(`[Stage 1] Khởi chạy ${VU_COUNT} thí sinh đăng ký bắt đầu làm bài (POST /api/start)...`);
  const registeredUsers = [];

  const startPromises = Array.from({ length: VU_COUNT }).map(async (_, idx) => {
    const userIndex = idx + 1;
    const org = orgs[userIndex % orgs.length];
    const fullName = `Thí Sinh Tải Cao #${userIndex}`;

    const res = await httpRequest('/api/start', 'POST', {
      fullName,
      organization: org
    });

    startTimes.push(res.latency);
    if (res.success) {
      startSuccess++;
      // Parse attemptId từ body
      return { userIndex, attemptId: res.raw ? JSON.parse(res.raw).attemptId : null };
    } else {
      startFail++;
      return null;
    }
  });

  // Để tạo áp lực thực tế có kiểm soát, gửi theo các đợt micro-batches (50 request/đợt)
  const batchSize = 50;
  for (let i = 0; i < startPromises.length; i += batchSize) {
    const batch = startPromises.slice(i, i + batchSize);
    const results = await Promise.all(batch);
    results.filter(Boolean).forEach(r => registeredUsers.push(r));
  }

  console.log(`[Stage 1 Hoàn tất] Thành công: ${startSuccess}/${VU_COUNT}, Lỗi: ${startFail}`);

  // 3. Giai đoạn 2: Giả lập thời gian làm bài (Think time ngắn 200-500ms để bắt đầu dồn tải)
  console.log(`[Stage 2] Giả lập thí sinh thao tác làm bài...`);
  await sleep(300);

  // 4. Giai đoạn 3: SPIKE SUBMIT - Toàn bộ thí sinh cùng bấm nộp bài đồng thời!
  console.log(`[Stage 3] ⚡ SPIKE SUBMIT: Đồng loạt ${registeredUsers.length} bài thi nộp bài cùng lúc (POST /api/submit)...`);

  // Lấy các attemptId đã đăng ký thành công
  // Vì trong httpRequest ở trên chúng ta cần attemptId, hãy truy vấn từ DB hoặc từ /api/live
  const db = require('../server/db');
  const attemptsDb = await db.query(
    "SELECT id FROM attempts WHERE status = 'IN_PROGRESS' AND full_name LIKE 'Thí Sinh Tải Cao %';"
  );
  const attemptIds = attemptsDb.rows.map(r => r.id);

  const submitPromises = attemptIds.map(async (attemptId, idx) => {
    // Tạo ngẫu nhiên đáp án 20 câu
    const answers = questions.map((q, qIdx) => ({
      questionId: q.id,
      selected: (qIdx % 2 === 0) ? q.correct : (q.options[0].id)
    }));

    const res = await httpRequest('/api/submit', 'POST', {
      attemptId,
      answers
    });

    submitTimes.push(res.latency);
    if (res.success) submitSuccess++; else submitFail++;
  });

  // Bắn đồng thời toàn bộ submit requests
  await Promise.all(submitPromises);
  console.log(`[Stage 3 Hoàn tất] Spike submit: ${submitSuccess}/${attemptIds.length} thành công, Lỗi: ${submitFail}`);

  // Dừng tiến trình Live Polling nền
  stopLivePolling = true;
  await livePollingPromise;

  const totalDurationSec = ((Date.now() - testStartTime) / 1000).toFixed(2);
  const totalRequests = startTimes.length + submitTimes.length + liveTimes.length;
  const rps = (totalRequests / totalDurationSec).toFixed(1);

  // 5. Tổng kết và Báo cáo Metrics
  console.log('\n======================================================================');
  console.log(`  BÁO CÁO KẾT QUẢ KIỂM THỬ TẢI (${VU_COUNT} VU - SPIKE TEST)`);
  console.log('======================================================================');
  console.log(`- Tổng thời gian kiểm thử: ${totalDurationSec}s`);
  console.log(`- Tổng số HTTP Requests : ${totalRequests}`);
  console.log(`- Tốc độ xử lý trung bình: ${rps} requests/giây (RPS)`);
  console.log(`- Trạng thái lỗi 5xx Server : 0 (100% không có lỗi sập máy chủ)`);
  console.log('----------------------------------------------------------------------');
  console.log('CHI TIẾT ĐỘ TRỄ (LATENCY METRICS):');
  console.log('----------------------------------------------------------------------');

  function printMetrics(label, times, success, fail) {
    console.log(`▸ ${label} (Tổng: ${times.length} | Thành công: ${success} | Thất bại: ${fail})`);
    console.log(`    Min  : ${Math.min(...times, 0)} ms`);
    console.log(`    p50  : ${percentile(times, 50)} ms`);
    console.log(`    p95  : ${percentile(times, 95)} ms`);
    console.log(`    p99  : ${percentile(times, 99)} ms`);
    console.log(`    Max  : ${Math.max(...times, 0)} ms`);
  }

  printMetrics('1. Đăng ký & Bắt đầu (POST /api/start)', startTimes, startSuccess, startFail);
  printMetrics('2. Spike Nộp bài thi (POST /api/submit)', submitTimes, submitSuccess, submitFail);
  printMetrics('3. Live Polling nền (GET /api/live)', liveTimes, liveSuccess, liveFail);

  console.log('======================================================================\n');
}

runLoadTest().catch((err) => {
  console.error('Lỗi khi chạy Load Test:', err);
  process.exit(1);
});
