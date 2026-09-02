const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
  console.log('  BẮT ĐẦU BỘ KIỂM THỬ TỰ ĐỘNG PHASE 06: SECURITY & RESILIENCE');
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

  // Test 1: Bảo mật đề thi - Không serve static file questions.json
  await test('1. GET /questions.json qua web -> Trả 404 (Không bị lộ tĩnh)', async () => {
    const res = await makeRequest('/questions.json');
    assert.strictEqual(res.status, 404);
  });

  await test('2. GET /server/data/questions.json qua web -> Trả 404', async () => {
    const res = await makeRequest('/server/data/questions.json');
    assert.strictEqual(res.status, 404);
  });

  // Test 3: Header x-powered-by đã bị vô hiệu hóa
  await test('3. Kiểm tra Header x-powered-by -> Bị ẩn hoàn toàn', async () => {
    const res = await makeRequest('/health');
    assert.strictEqual(res.headers['x-powered-by'], undefined, 'x-powered-by phải bị vô hiệu hóa');
  });

  // Test 4: Đề thi trả về cho thí sinh tuyệt đối không chứa đáp án đúng
  await test('4. POST /api/start trả về đề thi -> Không chứa "correct" và "explanation"', async () => {
    // Đảm bảo trạng thái đang RUNNING
    execSync('node scripts/set_state.js RUNNING', { stdio: 'ignore' });

    const res = await makeRequest('/api/start', {
      method: 'POST',
      body: {
        fullName: 'Kiểm Thử Bảo Mật',
        organization: 'Đoàn Thanh niên Cộng sản Hồ Chí Minh phường'
      }
    });

    assert.strictEqual(res.status, 201);
    assert(Array.isArray(res.data.questions), 'Phải có danh sách câu hỏi');
    assert.strictEqual(res.data.questions.length, 20);

    // Kiểm tra từng câu hỏi
    res.data.questions.forEach((q, idx) => {
      assert.strictEqual(q.correct, undefined, `Câu hỏi #${idx + 1} không được chứa trường 'correct'`);
      assert.strictEqual(q.explanation, undefined, `Câu hỏi #${idx + 1} không được chứa trường 'explanation'`);
      assert(Array.isArray(q.options));
      q.options.forEach(opt => {
        assert.strictEqual(opt.isCorrect, undefined);
      });
    });
  });

  // Test 5: Chống XSS trong Họ và tên
  await test('5. POST /api/start với payload XSS (<script>) -> Bị chặn 400', async () => {
    const res = await makeRequest('/api/start', {
      method: 'POST',
      body: {
        fullName: '<script>alert("hack")</script>',
        organization: 'Đoàn Thanh niên Cộng sản Hồ Chí Minh phường'
      }
    });
    assert.strictEqual(res.status, 400);
    assert(res.data.error.includes('không hợp lệ'));
  });

  // Test 6: Validate đơn vị công tác theo danh mục chuẩn
  await test('6. POST /api/start với đơn vị không hợp lệ -> Bị chặn 400', async () => {
    const res = await makeRequest('/api/start', {
      method: 'POST',
      body: {
        fullName: 'Thí Sinh Ảo',
        organization: 'Đơn Vị Giả Mạo Không Tồn Tại'
      }
    });
    assert.strictEqual(res.status, 400);
    assert(res.data.error.includes('danh mục hợp lệ'));
  });

  // Test 7: Validate UUID format - Không rò rỉ database internal error
  await test('7. GET /api/attempt với UUID sai định dạng -> Trả 400 an toàn (không lộ DB SQL error)', async () => {
    const res = await makeRequest('/api/attempt/malicious-sql-or-id');
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.error, 'Mã lượt thi không hợp lệ (yêu cầu định dạng UUID)');
  });

  await test('8. GET /api/result với UUID sai định dạng -> Trả 400 an toàn', async () => {
    const res = await makeRequest('/api/result/invalid-uuid-123');
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.error, 'Mã lượt thi không hợp lệ (yêu cầu định dạng UUID)');
  });

  // Test 9: Script sao lưu dữ liệu hoạt động và sinh file backup
  await test('9. Chạy script backup.js -> Sinh file sao lưu .sql hợp lệ', async () => {
    execSync('node scripts/backup.js', { stdio: 'ignore' });
    const backupDir = path.join(__dirname, '../backups');
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.sql'));
    assert(files.length > 0, 'Phải có ít nhất 1 file .sql trong thư mục backups/');
    const latestFile = path.join(backupDir, files[files.length - 1]);
    const stat = fs.statSync(latestFile);
    assert(stat.size > 0, 'File backup không được rỗng');
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
