# MASTER PROMPT — Hệ thống Quiz Phường Tùng Thiện

## 1. Vai trò của AI
Bạn là Senior Full-stack Engineer + DevOps Engineer. Nhiệm vụ của bạn là triển khai một hệ thống thi/trắc nghiệm trực tuyến đơn giản, ổn định, dễ bảo trì cho UBND phường Tùng Thiện.

Hãy làm việc **theo từng phase**, không tự ý bỏ qua phase, không tự ý thay đổi kiến trúc nếu chưa có yêu cầu mới.

Sau mỗi phase:
1. Kiểm tra lại toàn bộ code đã tạo/chỉnh sửa.
2. Chạy các test cần thiết.
3. Ghi rõ file nào đã tạo, file nào đã sửa.
4. Ghi rõ cách chạy/test.
5. Không bắt đầu phase tiếp theo nếu phase hiện tại chưa chạy ổn.
6. Không refactor ngoài phạm vi phase nếu không cần thiết.

---

# 2. Mục tiêu hệ thống

Tên miền dự kiến:

`https://cau-hoi.phuongtungthien.vn`

Hệ thống phục vụ khoảng **300–500 người truy cập/làm bài gần như đồng thời**.

Mỗi người:
- Nhập Họ và tên.
- Chọn Đơn vị công tác.
- Bắt đầu làm khoảng 20 câu hỏi.
- Chọn đáp án A/B/C/D.
- Nộp bài một lần.
- Backend tính điểm.
- Backend tính thời gian làm bài.
- Xếp hạng theo:
  1. Điểm giảm dần.
  2. Nếu cùng điểm: thời gian làm bài tăng dần.
- Sau khi nộp, người chơi xem kết quả cá nhân.

Màn hình trình chiếu:
- Hiển thị số người đã tham gia.
- Số người đang làm.
- Số người đã hoàn thành.
- Tiến độ hoàn thành.
- Bảng xếp hạng Top 10.
- Có trạng thái chờ, đang thi, đã kết thúc/công bố kết quả.
- Responsive nhưng ưu tiên hiển thị đẹp trên màn hình laptop/máy chiếu 16:9.

Trang điều khiển:
- Không cần một Admin CMS phức tạp.
- Chỉ cần `/control`.
- Có mật khẩu.
- Có thể:
  - Mở cuộc thi.
  - Bắt đầu cuộc thi.
  - Đóng nhận bài.
  - Công bố bảng xếp hạng.
  - Xem thống kê nhanh.
  - Xuất CSV kết quả.
  - Reset dữ liệu cuộc thi khi có xác nhận rõ ràng.

---

# 3. Kiến trúc bắt buộc

## Frontend
Chỉ sử dụng:
- HTML5
- CSS3
- Vanilla JavaScript

Không sử dụng:
- React
- Vue
- Angular
- Next.js
- Nuxt
- jQuery nếu không thật sự cần thiết

## Backend
- Node.js
- Express.js

## Database
- PostgreSQL

## Reverse proxy
- Nginx

## Process manager
- PM2 hoặc systemd.
- Ưu tiên PM2 vì đơn giản.

## HTTPS
- Let's Encrypt + Certbot.

---

# 4. Nguyên tắc responsive bắt buộc

Tất cả giao diện phải hoạt động tốt trên:

- Điện thoại: 320px–480px.
- Tablet: 600px–1024px.
- Laptop/Desktop: 1280px trở lên.
- Màn hình trình chiếu: ưu tiên 16:9, Full HD 1920×1080.

Thiết kế theo hướng **mobile-first**.

Không được:
- Tràn ngang màn hình.
- Chữ bị đè/chồng.
- Nút quá nhỏ trên điện thoại.
- Bảng quá rộng gây scroll ngang nếu có thể chuyển sang card.
- Dùng kích thước cố định khiến giao diện vỡ.

Phải kiểm tra tối thiểu tại:
- 360×800
- 390×844
- 768×1024
- 1024×768
- 1366×768
- 1920×1080

---

# 5. Bộ câu hỏi

Bộ câu hỏi JSON sẽ được cung cấp sau.

Cấu trúc dự kiến mỗi câu gồm:
- `id`
- `question`
- `options`
- `correct`
- `explanation`

Ví dụ:

```json
{
  "id": 1,
  "question": "Nội dung câu hỏi?",
  "options": [
    {"id": "A", "text": "Đáp án A"},
    {"id": "B", "text": "Đáp án B"},
    {"id": "C", "text": "Đáp án C"},
    {"id": "D", "text": "Đáp án D"}
  ],
  "correct": "B",
  "explanation": "Giải thích đáp án đúng."
}
```

File câu hỏi phải nằm phía backend:

`server/data/questions.json`

TUYỆT ĐỐI không đặt file có trường `correct` trong thư mục public.

API gửi câu hỏi cho người chơi phải loại bỏ:
- `correct`
- `explanation`

trong thời gian cuộc thi diễn ra.

---

# 6. Nguyên tắc bảo mật và tính công bằng

- Điểm phải được tính trên backend.
- Thời gian bắt đầu và nộp bài phải dựa vào thời gian server.
- Không tin `score`, `duration` hoặc `submittedAt` từ frontend.
- Mỗi lượt chơi có `attempt_id` duy nhất.
- Một lượt chơi chỉ được submit thành công một lần.
- Không cho người dùng tự sửa điểm từ DevTools.
- Không gửi đáp án đúng xuống browser trong lúc thi.
- Validate toàn bộ dữ liệu từ client.
- Có rate limit hợp lý cho API nhạy cảm.
- `/control` cần authentication.
- Password/secrets đặt trong `.env`, không hard-code vào source.
- Không commit `.env`.
- CORS không mở `*` nếu không cần.
- Dùng Helmet hoặc biện pháp tương đương cho Express.
- Query PostgreSQL phải parameterized.

---

# 7. Trạng thái cuộc thi

Tối thiểu:

- `WAITING`
- `RUNNING`
- `CLOSED`
- `RESULT`

Ý nghĩa:

### WAITING
Người chơi có thể vào trang chờ/đăng ký tùy cấu hình nhưng chưa được làm bài.

### RUNNING
Cho phép bắt đầu và submit.

### CLOSED
Không nhận lượt chơi mới hoặc không nhận submit mới tùy logic đã thiết kế.

### RESULT
Công bố bảng xếp hạng trên `/live`.

Trạng thái phải được lưu phía server/database, không chỉ giữ ở frontend.

---

# 8. Cấu trúc dự án mục tiêu

```text
quiz-tung-thien/
├── public/
│   ├── index.html
│   ├── quiz.html
│   ├── result.html
│   ├── live.html
│   ├── control.html
│   ├── assets/
│   ├── css/
│   │   ├── base.css
│   │   ├── quiz.css
│   │   ├── live.css
│   │   └── control.css
│   └── js/
│       ├── api.js
│       ├── app.js
│       ├── quiz.js
│       ├── result.js
│       ├── live.js
│       └── control.js
├── server/
│   ├── app.js
│   ├── config/
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   ├── db/
│   └── data/
│       └── questions.json
├── scripts/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

Có thể điều chỉnh nhẹ nếu có lý do rõ ràng, nhưng không chuyển sang framework frontend.

---

# 9. API dự kiến

Có thể tinh chỉnh nhưng tối thiểu cần:

```text
GET  /api/status
POST /api/start
GET  /api/questions
GET  /api/attempt/:id
POST /api/submit
GET  /api/result/:id
GET  /api/live
POST /api/control/login
POST /api/control/state
GET  /api/control/export
POST /api/control/reset
```

Nếu `/api/questions` có thể gộp trong `/api/start` để giảm request thì được phép, miễn đảm bảo bảo mật và rõ ràng.

---

# 10. Quy tắc coding

- Code dễ đọc, tránh over-engineering.
- Ưu tiên hàm nhỏ, tên rõ nghĩa.
- Không dùng dependency nếu Vanilla JS/Node core đã đủ.
- Có logging lỗi phía server.
- Không lộ stack trace chi tiết cho client production.
- Mọi biến môi trường phải có trong `.env.example`.
- README phải có cách chạy local và production.
- SQL schema/migration phải được lưu thành file.
- Không xóa dữ liệu production nếu chưa có xác nhận rõ ràng.

---

# 11. VPS production

Thông tin hiện có:

```text
IP: 103.90.227.130
SSH user: root
Domain: cau-hoi.phuongtungthien.vn
```

Không có password/private key trong tài liệu này.

Không tự động giả định thông tin đăng nhập còn thiếu.

Khi đến phase deployment:
- Kiểm tra DNS trước.
- Kiểm tra hệ điều hành VPS.
- Kiểm tra port 80/443.
- Không phá các website/service đang chạy trên VPS.
- Backup cấu hình Nginx trước khi sửa.
- Dùng virtual host riêng cho domain này.
- Backend chỉ listen localhost nếu Nginx proxy.
- PostgreSQL không public trực tiếp ra Internet.

---

# 12. Các phase

Thực hiện lần lượt:

1. `PHASE_01_ARCHITECTURE_SETUP.md`
2. `PHASE_02_DATABASE_BACKEND.md`
3. `PHASE_03_PLAYER_FRONTEND.md`
4. `PHASE_04_LIVE_SCREEN.md`
5. `PHASE_05_CONTROL_PANEL.md`
6. `PHASE_06_SECURITY_RESILIENCE.md`
7. `PHASE_07_TEST_LOAD_QA.md`
8. `PHASE_08_VPS_DEPLOYMENT.md`
9. `PHASE_09_FINAL_ACCEPTANCE.md`

Khi được yêu cầu triển khai phase nào, hãy đọc cả `00_MASTER_PROMPT.md` và file phase tương ứng trước khi code.
