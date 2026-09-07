/**
 * Test kịch bản hội trường: 60 thí sinh cùng mạng Wi-Fi (chung 1 IP)
 * đồng loạt đăng ký, làm bài và nộp bài KHÔNG SỬ DỤNG bypass token.
 */
const http = require('http');
const db = require('../server/db');
const questionService = require('../server/services/questionService');
const stateService = require('../server/services/stateService');

const BASE_URL = 'http://localhost:3000';
const NUM_CANDIDATES = 200;

function sendPost(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(BASE_URL + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
        // Lưu ý: Tuyệt đối KHÔNG gửi header x-load-test-token để test trực tiếp rate limiters
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch(e) {}
        resolve({ status: res.statusCode, data: json, raw: data });
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runTest() {
  console.log('=== BẮT ĐẦU KIỂM THỬ TẢI CHUNG MẠNG WI-FI (CHUNG 1 IP KHÔNG DÙNG BYPASS) ===\n');

  // 1. Đảm bảo trạng thái RUNNING
  await stateService.setQuizState('RUNNING');

  // 2. Dọn dẹp dữ liệu test cũ
  await db.query(`DELETE FROM attempts WHERE full_name LIKE 'Thí sinh Wi-Fi %';`);

  console.log(`[Bước 1] Gửi đồng thời ${NUM_CANDIDATES} yêu cầu /api/start từ cùng 1 IP...`);
  const startPromises = [];
  for (let i = 1; i <= NUM_CANDIDATES; i++) {
    startPromises.push(
      sendPost('/api/start', {
        fullName: `Thí sinh Wi-Fi ${i}`,
        organization: 'Lãnh đạo UBND phường'
      })
    );
  }

  const startResults = await Promise.all(startPromises);
  const start429 = startResults.filter(r => r.status === 429);
  const start201 = startResults.filter(r => r.status === 201);

  console.log(`- Thành công (201): ${start201.length}/${NUM_CANDIDATES}`);
  console.log(`- Bị chặn Rate-Limit (429): ${start429.length}/${NUM_CANDIDATES}`);

  if (start429.length > 0) {
    console.error('❌ THẤT BẠI: Vẫn có yêu cầu bị chặn rate limit 429 khi đăng ký!', start429[0]);
    process.exit(1);
  }

  console.log('\n[Bước 2] Gửi cập nhật tiến độ /api/progress cho toàn bộ 60 thí sinh cùng lúc...');
  const progressPromises = [];
  start201.forEach((res, idx) => {
    const attemptId = res.data.attemptId;
    progressPromises.push(
      sendPost('/api/progress', {
        attemptId,
        questionId: 1,
        selected: 'A'
      })
    );
  });

  const progressResults = await Promise.all(progressPromises);
  const prog429 = progressResults.filter(r => r.status === 429);
  const prog200 = progressResults.filter(r => r.status === 200);

  console.log(`- Thành công (200): ${prog200.length}/${NUM_CANDIDATES}`);
  console.log(`- Bị chặn Rate-Limit (429): ${prog429.length}/${NUM_CANDIDATES}`);

  if (prog429.length > 0) {
    console.error('❌ THẤT BẠI: Vẫn có yêu cầu bị chặn rate limit 429 khi gửi tiến độ!', prog429[0]);
    process.exit(1);
  }

  console.log('\n[Bước 3] Toàn bộ 60 thí sinh cùng lúc gửi nộp bài /api/submit...');
  const submitPromises = [];
  start201.forEach((res) => {
    const attemptId = res.data.attemptId;
    submitPromises.push(
      sendPost('/api/submit', {
        attemptId,
        answers: [{ questionId: 1, selected: 'A' }]
      })
    );
  });

  const submitResults = await Promise.all(submitPromises);
  const submit429 = submitResults.filter(r => r.status === 429);
  const submit200 = submitResults.filter(r => r.status === 200);

  console.log(`- Thành công (200): ${submit200.length}/${NUM_CANDIDATES}`);
  console.log(`- Bị chặn Rate-Limit (429): ${submit429.length}/${NUM_CANDIDATES}`);

  if (submit429.length > 0) {
    console.error('❌ THẤT BẠI: Vẫn có yêu cầu bị chặn rate limit 429 khi nộp bài!', submit429[0]);
    process.exit(1);
  }

  // Dọn dẹp dữ liệu test
  await db.query(`DELETE FROM attempts WHERE full_name LIKE 'Thí sinh Wi-Fi %';`);
  await db.pool.end();

  console.log('\n✅ TẤT CẢ CÁC BƯỚC ĐÃ VƯỢT QUA KIỂM THỬ XUẤT SẮC! Không một thí sinh nào bị chặn.');
}

runTest().catch(err => {
  console.error('Lỗi kiểm thử:', err);
  process.exit(1);
});
