const assert = require('assert');
const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const { method = 'GET', body = null, headers = {} } = options;
    const url = new URL(path, BASE_URL);

    const reqHeaders = {
      'Accept': 'application/json',
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
  console.log('  BẮT ĐẦU BỘ KIỂM THỬ TỰ ĐỘNG PHASE 02: DATABASE & BACKEND QUIZ');
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

  // Test 1: Kiểm tra trạng thái hệ thống
  await test('1. GET /api/status trả về trạng thái hợp lệ', async () => {
    const res = await makeRequest('/api/status');
    assert.strictEqual(res.status, 200);
    assert(res.data.state, 'Thiếu trường state');
    assert.strictEqual(typeof res.data.state, 'string');
    assert(res.data.title, 'Thiếu trường title');
  });

  // Test 2: Kiểm tra danh mục đơn vị công tác
  await test('2. GET /api/organizations trả về danh mục đơn vị', async () => {
    const res = await makeRequest('/api/organizations');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
    assert(res.data.length > 0, 'Danh sách đơn vị rỗng');
  });

  // Test 3: Validation khi thiếu họ tên thí sinh
  await test('3. POST /api/start thiếu họ tên -> trả 400 Bad Request', async () => {
    const res = await makeRequest('/api/start', {
      method: 'POST',
      body: {
        fullName: '',
        organization: 'Chi bộ Tổ 1'
      }
    });
    assert.strictEqual(res.status, 400);
    assert(res.data.error, 'Phải có thông báo lỗi');
  });

  // Test 4: Bắt đầu lượt thi và kiểm tra BẢO MẬT câu hỏi (KHÔNG LỘ ĐÁP ÁN)
  let attemptA = null;
  await test('4. POST /api/start hợp lệ -> BẢO MẬT: KHÔNG LỘ correct & explanation', async () => {
    const res = await makeRequest('/api/start', {
      method: 'POST',
      body: {
        fullName: 'Nguyễn Văn Kiểm Thử',
        organization: 'Đoàn Thanh niên Cộng sản Hồ Chí Minh phường'
      }
    });
    assert.strictEqual(res.status, 201);
    assert(res.data.attemptId, 'Thiếu attemptId');
    assert(Array.isArray(res.data.questions), 'questions phải là mảng');
    assert.strictEqual(res.data.questions.length, 20, 'Phải có đủ 20 câu hỏi');

    // Kiểm tra từng câu hỏi: tuyệt đối không được có "correct" hoặc "explanation"
    for (const q of res.data.questions) {
      assert.strictEqual(q.correct, undefined, `Bị lộ đáp án đúng ở câu ${q.id}!`);
      assert.strictEqual(q.explanation, undefined, `Bị lộ giải thích ở câu ${q.id}!`);
      assert(Array.isArray(q.options), `Câu ${q.id} thiếu options`);
      assert.strictEqual(q.options.length, 4, `Câu ${q.id} phải có 4 options`);
    }

    attemptA = res.data;
  });

  // Test 5: Khôi phục lượt thi qua /api/attempt/:id
  await test('5. GET /api/attempt/:id khôi phục lượt thi khi refresh', async () => {
    assert(attemptA && attemptA.attemptId);
    const res = await makeRequest(`/api/attempt/${attemptA.attemptId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'IN_PROGRESS');
    assert.strictEqual(res.data.fullName, 'Nguyễn Văn Kiểm Thử');
    assert.strictEqual(res.data.questions.length, 20);
  });

  // Test 6: Tra cứu attempt không tồn tại
  await test('6. GET /api/attempt/:id với ID giả lập -> trả 404 Not Found', async () => {
    const res = await makeRequest('/api/attempt/00000000-0000-0000-0000-000000000000');
    assert.strictEqual(res.status, 404);
  });

  // Test 7: Nộp bài thi và tính điểm trên backend
  let submitResultA = null;
  await test('7. POST /api/submit -> Backend tự tính điểm và thời gian chính xác', async () => {
    // Đọc questions.json từ ổ đĩa để biết đáp án đúng phục vụ kiểm thử
    const questions = require('../server/data/questions.json');

    // Tạo danh sách câu trả lời: 18 câu đúng, 2 câu sai
    const answers = questions.map((q, idx) => {
      if (idx < 18) {
        return { questionId: q.id, selected: q.correct }; // ĐÚNG
      } else {
        // Chọn sai
        const wrongOpt = q.options.find(o => o.id !== q.correct).id;
        return { questionId: q.id, selected: wrongOpt }; // SAI
      }
    });

    const res = await makeRequest('/api/submit', {
      method: 'POST',
      body: {
        attemptId: attemptA.attemptId,
        answers
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.score, 18, 'Điểm số phải đúng 18');
    assert.strictEqual(res.data.totalQuestions, 20);
    assert(typeof res.data.durationMs === 'number' && res.data.durationMs >= 0);
    assert.strictEqual(res.data.status, 'SUBMITTED');

    submitResultA = res.data;
  });

  // Test 8: Chống submit kép (Double Submit Prevention)
  await test('8. POST /api/submit lần 2 -> Bị từ chối 409 Conflict', async () => {
    const res = await makeRequest('/api/submit', {
      method: 'POST',
      body: {
        attemptId: attemptA.attemptId,
        answers: [{ questionId: 1, selected: 'A' }]
      }
    });
    assert.strictEqual(res.status, 409, 'Phải trả về 409 Conflict khi submit lại');
  });

  // Test 9: Kiểm tra chống Race Condition với Concurrent Requests
  await test('9. Chống Race Condition: 5 request submit đồng thời -> Chỉ 1 thành công', async () => {
    // Tạo 1 attempt mới
    const startRes = await makeRequest('/api/start', {
      method: 'POST',
      body: {
        fullName: 'Thí Sinh Race Condition',
        organization: 'Công an phường Tùng Thiện'
      }
    });
    assert.strictEqual(startRes.status, 201);
    const concurrentAttemptId = startRes.data.attemptId;

    // Bắn 5 request submit đồng thời
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(makeRequest('/api/submit', {
        method: 'POST',
        body: {
          attemptId: concurrentAttemptId,
          answers: [{ questionId: 1, selected: 'B' }]
        }
      }));
    }

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.status === 200).length;
    const conflictCount = results.filter(r => r.status === 409).length;

    assert.strictEqual(successCount, 1, `Chỉ được phép 1 request thành công, thực tế: ${successCount}`);
    assert.strictEqual(conflictCount, 4, `4 request còn lại phải bị từ chối 409, thực tế: ${conflictCount}`);
  });

  // Test 10: Xem kết quả cá nhân và thứ hạng
  await test('10. GET /api/result/:id trả về chi tiết kết quả & thứ hạng', async () => {
    const res = await makeRequest(`/api/result/${attemptA.attemptId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.fullName, 'Nguyễn Văn Kiểm Thử');
    assert.strictEqual(res.data.score, 18);
    assert(typeof res.data.rank === 'number' && res.data.rank >= 1);
    assert(typeof res.data.totalCompleted === 'number' && res.data.totalCompleted >= 2);
  });

  // Test 11: Màn hình Live & Top 10 Leaderboard
  await test('11. GET /api/live trả về số liệu thống kê & bảng xếp hạng Top 10', async () => {
    const res = await makeRequest('/api/live');
    assert.strictEqual(res.status, 200);
    assert(typeof res.data.registered === 'number');
    assert(typeof res.data.completed === 'number');
    assert(typeof res.data.completionRate === 'number');
    assert(Array.isArray(res.data.top));
    assert(res.data.top.length > 0);

    // Kiểm tra thứ tự sắp xếp: điểm cao đứng trước
    for (let i = 0; i < res.data.top.length - 1; i++) {
      const curr = res.data.top[i];
      const next = res.data.top[i + 1];
      assert(
        curr.score > next.score ||
        (curr.score === next.score && curr.durationMs <= next.durationMs),
        `Sai thứ tự sắp xếp bảng xếp hạng tại vị trí ${i}`
      );
    }
  });

  console.log('\n===============================================================');
  console.log(`  TỔNG KẾT: ${passed} PASSED / ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Lỗi thực thi kiểm thử:', err);
  process.exit(1);
});
