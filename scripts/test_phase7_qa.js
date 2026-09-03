const assert = require('assert');
const http = require('http');
const { execSync } = require('child_process');

const BASE_URL = 'http://localhost:3000';
const LOAD_TEST_SECRET = 'LOAD_TEST_SECRET_2025';

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const { method = 'GET', body = null, headers = {} } = options;
    const url = new URL(path, BASE_URL);

    const reqHeaders = {
      'Accept': 'application/json',
      'x-load-test-token': LOAD_TEST_SECRET,
      ...headers
    };

    let payload = null;
    if (body) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(url, {
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          raw: data,
          data: json
        });
      });
    });

    req.on('error', reject);

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('  BẮT ĐẦU BỘ KIỂM THỬ TỰ ĐỘNG PHASE 07: FUNCTIONAL QA & TIE-BREAK');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    process.stdout.write(`[TEST] ${name} ... `);
    try {
      await fn();
      console.log('PASSED ✓');
      passed++;
    } catch (err) {
      console.log('FAILED ✗');
      console.error(`       Lỗi: ${err.message}`);
      failed++;
    }
  }

  // Đảm bảo trạng thái đang RUNNING
  execSync('node scripts/set_state.js RUNNING', { stdio: 'ignore' });
  const questions = require('../server/data/questions.json');

  // Test 1: Hỗ trợ tên tiếng Việt đầy đủ dấu và emoji
  await test('1. Thí sinh có tên tiếng Việt đầy đủ dấu và emoji (🌟)', async () => {
    const res = await makeRequest('/api/start', {
      method: 'POST',
      body: {
        fullName: 'Nguyễn Thị Quỳnh Như 🌟',
        organization: 'Phòng Văn hóa - Xã hội'
      }
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.fullName, 'Nguyễn Thị Quỳnh Như 🌟');
  });

  // Test 2: Nộp bài khi chưa trả lời hết các câu hỏi (ví dụ chỉ làm 5 câu)
  let partialAttemptId = null;
  await test('2. Nộp bài thi khi chỉ làm 5/20 câu -> Chấm điểm chính xác 5/20', async () => {
    const startRes = await makeRequest('/api/start', {
      method: 'POST',
      body: {
        fullName: 'Thí Sinh Làm Dở',
        organization: 'Văn phòng HĐND và UBND'
      }
    });
    assert.strictEqual(startRes.status, 201);
    partialAttemptId = startRes.data.attemptId;

    // Chỉ trả lời 5 câu đầu (đúng), bỏ trống 15 câu còn lại
    const partialAnswers = questions.slice(0, 5).map(q => ({
      questionId: q.id,
      selected: q.correct
    }));

    const submitRes = await makeRequest('/api/submit', {
      method: 'POST',
      body: {
        attemptId: partialAttemptId,
        answers: partialAnswers
      }
    });

    assert.strictEqual(submitRes.status, 200);
    assert.strictEqual(submitRes.data.score, 5);
    assert.strictEqual(submitRes.data.totalQuestions, 20);
  });

  // Test 3: Nộp bài khi trạng thái cuộc thi đã chuyển sang CLOSED -> Bị từ chối 403
  await test('3. Nộp bài khi cuộc thi đã CLOSED -> Bị từ chối 403 Forbidden', async () => {
    // Tạo 1 attempt khi đang RUNNING
    const startRes = await makeRequest('/api/start', {
      method: 'POST',
      body: {
        fullName: 'Thí Sinh Nộp Muộn',
        organization: 'Trạm Y tế'
      }
    });
    assert.strictEqual(startRes.status, 201);
    const lateAttemptId = startRes.data.attemptId;

    // Ban tổ chức đóng nhận bài
    execSync('node scripts/set_state.js CLOSED', { stdio: 'ignore' });
    // Đợi 1100ms để In-Memory Cache TTL (1000ms) của server làm mới
    await new Promise(r => setTimeout(r, 1100));

    // Thí sinh cố nộp bài
    const submitRes = await makeRequest('/api/submit', {
      method: 'POST',
      body: {
        attemptId: lateAttemptId,
        answers: [{ questionId: 1, selected: 'A' }]
      }
    });

    assert.strictEqual(submitRes.status, 403);
    assert(submitRes.data.error.includes('đóng nhận bài'));

    // Chuyển lại trạng thái RUNNING để tiếp tục test
    execSync('node scripts/set_state.js RUNNING', { stdio: 'ignore' });
  });

  // Test 4: Kiểm thử thuật toán xếp hạng và Tie-Breaking Rules
  // Quy tắc: 1. score DESC -> 2. duration_ms ASC -> 3. submitted_at ASC
  await test('4. Kiểm thử xếp hạng Tie-Break đa tầng (score DESC, duration_ms ASC, submitted_at ASC)', async () => {
    // Trợ giúp tạo và nộp bài với điểm và thời gian giả lập
    const db = require('../server/db');

    // Tạo 4 lượt thi mẫu trực tiếp vào DB
    const now = new Date();
    const t1 = new Date(now.getTime() - 60000);
    const t2 = new Date(now.getTime() - 50000);
    const t3 = new Date(now.getTime() - 40000);
    const t4 = new Date(now.getTime() - 30000);

    // Người 1: 20 điểm, 40 giây (40000ms), nộp lúc t1
    // Người 2: 20 điểm, 55 giây (55000ms), nộp lúc t2
    // Người 3: 19 điểm, 20 giây (20000ms), nộp lúc t3 (nhanh hơn nhưng điểm thấp hơn)
    // Người 4: 20 điểm, 40 giây (40000ms), nộp lúc t4 (cùng điểm và duration với Người 1, nhưng nộp sau)
    const sql = `
      INSERT INTO attempts (full_name, organization, score, duration_ms, status, started_at, submitted_at)
      VALUES 
        ('Thí Sinh 1 (Vàng)', 'Văn phòng Đảng ủy - HĐND - UBND phường', 20, 40000, 'SUBMITTED', $1, $2),
        ('Thí Sinh 2 (Đồng)', 'Bộ phận Một cửa / Tiếp nhận & Trả kết quả', 20, 55000, 'SUBMITTED', $3, $4),
        ('Thí Sinh 3 (Hạng 4)', 'Công an phường Tùng Thiện', 19, 20000, 'SUBMITTED', $5, $6),
        ('Thí Sinh 4 (Bạc)', 'Ban Chỉ huy Quân sự phường Tùng Thiện', 20, 40000, 'SUBMITTED', $7, $8)
      RETURNING id, full_name;
    `;

    const insRes = await db.query(sql, [
      new Date(t1.getTime() - 40000), t1,
      new Date(t2.getTime() - 55000), t2,
      new Date(t3.getTime() - 20000), t3,
      new Date(t4.getTime() - 40000), t4
    ]);

    const createdRows = insRes.rows;
    const id1 = createdRows.find(r => r.full_name.includes('Thí Sinh 1')).id;
    const id2 = createdRows.find(r => r.full_name.includes('Thí Sinh 2')).id;
    const id3 = createdRows.find(r => r.full_name.includes('Thí Sinh 3')).id;
    const id4 = createdRows.find(r => r.full_name.includes('Thí Sinh 4')).id;

    // Lấy kết quả cá nhân của từng người
    const res1 = await makeRequest(`/api/result/${id1}`);
    const res2 = await makeRequest(`/api/result/${id2}`);
    const res3 = await makeRequest(`/api/result/${id3}`);
    const res4 = await makeRequest(`/api/result/${id4}`);

    // Kiểm tra thứ hạng tương đối:
    // Thí sinh 1 phải xếp trước Thí sinh 4 (vì nộp lúc t1 < t4)
    assert(res1.data.rank < res4.data.rank, `Thí sinh 1 (hạng ${res1.data.rank}) phải xếp trên Thí sinh 4 (hạng ${res4.data.rank}) do nộp trước`);

    // Thí sinh 4 phải xếp trước Thí sinh 2 (vì duration 40s < 55s)
    assert(res4.data.rank < res2.data.rank, `Thí sinh 4 (hạng ${res4.data.rank}) phải xếp trên Thí sinh 2 (hạng ${res2.data.rank}) do nhanh hơn`);

    // Thí sinh 2 phải xếp trước Thí sinh 3 (vì điểm 20 > 19 dù Thí sinh 3 chỉ mất 20s)
    assert(res2.data.rank < res3.data.rank, `Thí sinh 2 (hạng ${res2.data.rank}) phải xếp trên Thí sinh 3 (hạng ${res3.data.rank}) do điểm cao hơn`);
  });

  console.log('\n===============================================================');
  console.log(`  TỔNG KẾT QA: ${passed} PASSED / ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Lỗi thực thi kiểm thử QA:', err);
  process.exit(1);
});
