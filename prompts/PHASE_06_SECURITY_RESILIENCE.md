# PHASE 06 — Security, dữ liệu và độ ổn định

## Mục tiêu
Gia cố hệ thống trước khi load test/deploy.

## 1. Express security
- Helmet.
- Disable `x-powered-by`.
- Request body size limit.
- Parameter validation.
- Rate limit:
  - login control chặt
  - start vừa phải
  - submit vừa phải
  - live GET không quá chặt
- Không trả lỗi DB raw.

## 2. Database
- Dùng user PostgreSQL riêng, không dùng postgres superuser cho app.
- Password mạnh từ env.
- DB chỉ bind localhost nếu cùng VPS.
- Parameterized queries.
- Connection pool giới hạn hợp lý.

## 3. Attempt safety
- UUID đủ ngẫu nhiên.
- Không cho sửa attempt của người khác qua client-provided fields.
- Submit idempotent hoặc transaction lock.
- Nếu request submit bị mất response, client kiểm tra status trước retry.

## 4. Questions confidentiality
Kiểm tra:
- `questions.json` không nằm public.
- Không bị serve bởi Express static.
- API question không có `correct`.
- Source map/frontend bundle không chứa đáp án.
- Không đưa đáp án vào HTML comments.

## 5. Control authentication
- Secure session.
- Session secret mạnh.
- Auth middleware.
- CSRF cân nhắc nếu dùng cookie session; triển khai biện pháp phù hợp.
- SameSite.
- Secure ở HTTPS.
- HttpOnly.

## 6. Logging
Log:
- server startup
- DB error
- state changes
- reset
- submit lỗi bất thường

Không log:
- secrets
- password
- session token đầy đủ

## 7. Graceful shutdown
Khi restart:
- ngừng nhận request mới
- close HTTP server
- close DB pool
- không làm hỏng transaction

## 8. Backup
Tạo script/hướng dẫn:
- `pg_dump`
- backup trước sự kiện
- backup sau sự kiện
- restore thử trên môi trường test nếu có thể

## 9. Nginx security plan
Chuẩn bị config:
- proxy headers
- timeout phù hợp
- max body nhỏ
- gzip/brotli nếu có
- cache static assets
- không cache API dynamic
- HTTPS redirect

## Tiêu chí hoàn thành
- Audit thủ công DevTools không tìm được đáp án.
- Unauthenticated control API bị chặn.
- Submit double click không tạo 2 kết quả.
- Backend restart không mất dữ liệu đã lưu DB.
