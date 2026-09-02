# PHASE 01 — Khởi tạo kiến trúc và project skeleton

## Mục tiêu
Tạo project chạy được ở local với đúng kiến trúc:
- HTML/CSS/Vanilla JS
- Node.js + Express
- PostgreSQL chuẩn bị sẵn cấu hình nhưng chưa cần hoàn thiện nghiệp vụ.
- Tạo cấu trúc thư mục sạch, dễ phát triển các phase sau.

## Việc cần làm

### 1. Khởi tạo project
- Tạo `package.json`.
- Thiết lập script:
  - `npm run dev`
  - `npm start`
- Có thể dùng `nodemon` ở dev.
- Không dùng framework frontend.

### 2. Cấu trúc thư mục
Tạo gần với cấu trúc trong MASTER PROMPT.

### 3. Express skeleton
- Tạo `server/app.js`.
- Serve static từ `public`.
- Có `/health`.
- Có JSON body parser với giới hạn hợp lý.
- Có error handler cơ bản.
- Có 404 JSON cho `/api/*`.
- Không lộ stack trace production.

### 4. Environment
Tạo `.env.example`:
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://quiz_user:change_me@127.0.0.1:5432/quiz_tung_thien
CONTROL_PASSWORD=change_me
SESSION_SECRET=change_me
QUIZ_TITLE=Thử thách kiến thức
```

Tạo `.gitignore` bao gồm `.env`, logs, node_modules.

### 5. Static pages placeholder
Tạo các trang:
- `/`
- `/quiz.html`
- `/result.html`
- `/live.html`
- `/control.html`

Mỗi trang chỉ cần placeholder rõ ràng ở phase này nhưng:
- HTML semantic.
- `<meta name="viewport">`.
- Có CSS base responsive.
- Không lỗi trên mobile.

### 6. Base CSS
Tạo design tokens bằng CSS variables:
- font-size
- spacing
- border-radius
- shadow
- max-width
- typography scale

Không cần chốt màu thương hiệu cuối cùng, nhưng giao diện phải sạch và trang trọng.

### 7. API helper frontend
Tạo `public/js/api.js` với helper fetch thống nhất:
- timeout hợp lý
- parse JSON
- xử lý lỗi
- không nhúng URL cố định; dùng relative `/api/...`

## Tiêu chí hoàn thành
- `npm install` thành công.
- `npm run dev` chạy.
- Mở `/` được.
- `/health` trả JSON status OK.
- Các page không 404.
- Không có console error cơ bản.
- Responsive ở 360px và 1366px.

## Không làm trong phase này
- Chưa tính điểm.
- Chưa làm leaderboard thật.
- Chưa làm login control.
- Chưa deploy VPS.
