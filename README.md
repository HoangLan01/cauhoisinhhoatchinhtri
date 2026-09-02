# Hệ thống Quiz Sinh hoạt Chính trị — Phường Tùng Thiện

Hệ thống thi trắc nghiệm trực tuyến phục vụ các đợt sinh hoạt chính trị, hội thi kiến thức của Đảng bộ, HĐND, UBND phường Tùng Thiện, thị xã Sơn Tây, TP. Hà Nội.

---

## 1. Kiến trúc hệ thống

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (Không dùng framework, thiết kế Mobile-first, tương thích màn hình máy chiếu hội trường 16:9).
- **Backend**: Node.js, Express.js.
- **Bảo mật**: `helmet`, `cors`, giới hạn body payload `100kb`, kiểm soát lỗi không lộ stack trace.
- **Cơ sở dữ liệu**: PostgreSQL (chuẩn bị kết nối cho Phase 2).
- **API Helper**: `public/js/api.js` hỗ trợ timeout với AbortController và chuẩn hóa xử lý lỗi.

---

## 2. Cấu trúc thư mục

```text
cau_hoi_sinh_hoat_chinh_tri/
├── public/                     # Frontend static assets
│   ├── index.html              # Trang chủ & Đăng ký thi
│   ├── quiz.html               # Màn hình làm bài thi trắc nghiệm
│   ├── result.html             # Màn hình kết quả cá nhân
│   ├── live.html               # Màn hình trình chiếu hội trường 16:9
│   ├── control.html            # Bảng điều khiển Ban tổ chức
│   ├── assets/                 # Hình ảnh, biểu tượng
│   ├── css/
│   │   ├── base.css            # Design tokens & layout utilities
│   │   ├── quiz.css            # Style làm bài thi
│   │   ├── live.css            # Style trình chiếu hội trường
│   │   └── control.css         # Style bảng điều khiển
│   └── js/
│       ├── api.js              # Fetch helper an toàn, timeout 10s
│       ├── app.js              # Logic đăng ký dự thi
│       ├── quiz.js             # Logic làm bài & chọn đáp án
│       ├── result.js           # Logic hiển thị kết quả
│       ├── live.js             # Logic realtime màn hình live
│       └── control.js          # Logic điều phối cuộc thi
├── server/                     # Backend Node.js / Express
│   ├── app.js                  # Entry point Express server
│   ├── config/                 # Cấu hình môi trường & DB
│   ├── routes/                 # Express API routes
│   ├── services/               # Nghiệp vụ tính điểm, xếp hạng
│   ├── middleware/             # Middleware bảo mật, xác thực
│   ├── db/                     # Migration & kết nối PostgreSQL
│   └── data/
│       └── questions.json      # Bộ câu hỏi nguồn (bảo mật backend)
├── scripts/                    # Scripts migration, seed dữ liệu
├── .env.example                # Mẫu biến môi trường
├── .gitignore
├── package.json
└── README.md
```

---

## 3. Cài đặt và Chạy thử nghiệm (Local)

### Yêu cầu
- Node.js >= 18 (Khuyên dùng v20+)
- npm >= 9

### Các bước cài đặt
```bash
# 1. Cài đặt các thư viện phụ thuộc
npm install

# 2. Khởi tạo file biến môi trường
cp .env.example .env
# (Trên Windows PowerShell: Copy-Item .env.example .env)

# 3. Chạy ở chế độ phát triển (Auto reload với nodemon)
npm run dev

# 4. Chạy ở chế độ production
npm start
```

Mặc định máy chủ sẽ lắng nghe tại:
- **Trang chủ & Làm bài**: [http://localhost:3000](http://localhost:3000)
- **Màn hình Trình chiếu (Live)**: [http://localhost:3000/live.html](http://localhost:3000/live.html)
- **Bảng Điều khiển (Control)**: [http://localhost:3000/control.html](http://localhost:3000/control.html)
- **Kiểm tra trạng thái máy chủ (Health Check)**: [http://localhost:3000/health](http://localhost:3000/health)

---

## 4. Các giai đoạn triển khai (Phases)

1. **Phase 01**: Khởi tạo kiến trúc và project skeleton (Đang hoàn thành).
2. **Phase 02**: PostgreSQL + Backend nghiệp vụ Quiz (Tính điểm, thời gian, state).
3. **Phase 03**: Giao diện người chơi hoàn chỉnh (Validation, bảo vệ lượt nộp).
4. **Phase 04**: Màn hình Live máy chiếu hội trường 16:9 (Top 10, Auto-refresh/SSE).
5. **Phase 05**: Bảng điều khiển Control Panel có xác thực.
6. **Phase 06**: Tối ưu bảo mật, chống gian lận & rate limiting.
7. **Phase 07**: Kiểm thử tải 300–500 CCU & QA.
8. **Phase 08**: Triển khai VPS production (Nginx, PM2, SSL Let's Encrypt).
9. **Phase 09**: Nghiệm thu và bàn giao hệ thống.
