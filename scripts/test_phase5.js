const assert = require('assert');
const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const { method = 'GET', body = null, headers = {}, cookie = null } = options;
    const url = new URL(path, BASE_URL);

    const reqHeaders = {
      'Accept': 'application/json',
      ...headers
    };

    if (cookie) {
      reqHeaders['Cookie'] = cookie;
    }

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
  console.log('  BẮT ĐẦU BỘ KIỂM THỬ TỰ ĐỘNG PHASE 05: CONTROL PANEL BAN TỔ CHỨC');
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

  // Test 1: Truy cập API quản trị khi chưa xác thực
  await test('1. GET /api/control/me khi chưa đăng nhập -> trả 401 Unauthorized', async () => {
    const res = await makeRequest('/api/control/me');
    assert.strictEqual(res.status, 401);
  });

  await test('2. POST /api/control/state khi chưa đăng nhập -> trả 401 Unauthorized', async () => {
    const res = await makeRequest('/api/control/state', {
      method: 'POST',
      body: { state: 'RUNNING' }
    });
    assert.strictEqual(res.status, 401);
  });

  // Test 3: Đăng nhập sai mật khẩu
  await test('3. POST /api/control/login mật khẩu sai -> trả 401', async () => {
    const res = await makeRequest('/api/control/login', {
      method: 'POST',
      body: { password: 'wrong_password_123' }
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.code, 'INVALID_CREDENTIALS');
  });

  // Test 4: Đăng nhập đúng mật khẩu
  let authCookie = null;
  await test('4. POST /api/control/login mật khẩu đúng -> cấp HttpOnly Cookie', async () => {
    const res = await makeRequest('/api/control/login', {
      method: 'POST',
      body: { password: 'tungthien2025' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);

    const setCookie = res.headers['set-cookie'];
    assert(setCookie && setCookie.length > 0, 'Phải có Set-Cookie header');

    const cookieStr = setCookie[0];
    assert(cookieStr.includes('control_token='), 'Cookie phải chứa control_token');
    assert(cookieStr.toLowerCase().includes('httponly'), 'Cookie phải có cờ HttpOnly');

    // Lưu cookie cho các request sau
    authCookie = cookieStr.split(';')[0];
  });

  // Test 5: Kiểm tra /api/control/me với cookie
  await test('5. GET /api/control/me với cookie -> trả 200 Authenticated', async () => {
    assert(authCookie);
    const res = await makeRequest('/api/control/me', { cookie: authCookie });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.authenticated, true);
    assert.strictEqual(res.data.role, 'admin');
  });

  // Test 6: Chuyển trạng thái cuộc thi
  await test('6. POST /api/control/state với cookie -> chuyển trạng thái thành công', async () => {
    assert(authCookie);
    const res = await makeRequest('/api/control/state', {
      method: 'POST',
      cookie: authCookie,
      body: { state: 'CLOSED' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.state, 'CLOSED');
  });

  // Test 7: Thống kê quản trị nâng cao
  await test('7. GET /api/control/stats với cookie -> trả 6 số liệu quản trị', async () => {
    assert(authCookie);
    const res = await makeRequest('/api/control/stats', { cookie: authCookie });
    assert.strictEqual(res.status, 200);
    assert(typeof res.data.registered === 'number');
    assert(typeof res.data.completed === 'number');
    assert(typeof res.data.avgScore === 'number');
    assert(typeof res.data.perfectCount === 'number');
  });

  // Test 8: Xuất CSV với UTF-8 BOM và định dạng Excel tiếng Việt
  await test('8. GET /api/control/export với cookie -> Trả file CSV có UTF-8 BOM (\\uFEFF)', async () => {
    assert(authCookie);
    const res = await makeRequest('/api/control/export', { cookie: authCookie });
    assert.strictEqual(res.status, 200);
    assert(res.headers['content-type'].includes('text/csv'));
    assert(res.headers['content-disposition'].includes('attachment; filename='));

    // Kiểm tra ký tự UTF-8 BOM ở đầu file
    const firstChar = res.raw.charCodeAt(0);
    assert.strictEqual(firstChar, 0xFEFF, 'File CSV phải bắt đầu bằng ký tự UTF-8 BOM (\\uFEFF)');

    // Kiểm tra dòng tiêu đề
    assert(res.raw.includes('Hạng,Họ và tên,Đơn vị công tác,Điểm số,Tổng số câu,Thời gian làm bài'));
  });

  // Test 9: Reset dữ liệu với từ khóa xác nhận không đúng -> Bị từ chối 400
  await test('9. POST /api/control/reset sai từ khóa xác nhận -> trả 400 Bad Request', async () => {
    assert(authCookie);
    const res = await makeRequest('/api/control/reset', {
      method: 'POST',
      cookie: authCookie,
      body: { confirmation: 'sai_tu_khoa' }
    });
    assert.strictEqual(res.status, 400);
  });

  // Test 10: Reset dữ liệu thành công với từ khóa 'RESET'
  await test('10. POST /api/control/reset với từ khóa "RESET" -> Xóa sạch dữ liệu và về WAITING', async () => {
    assert(authCookie);
    const res = await makeRequest('/api/control/reset', {
      method: 'POST',
      cookie: authCookie,
      body: { confirmation: 'RESET' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);

    // Kiểm tra lại trạng thái sau khi reset: phải là WAITING và registered = 0
    const statsRes = await makeRequest('/api/control/stats', { cookie: authCookie });
    assert.strictEqual(statsRes.data.state, 'WAITING');
    assert.strictEqual(statsRes.data.registered, 0);
    assert.strictEqual(statsRes.data.completed, 0);
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
