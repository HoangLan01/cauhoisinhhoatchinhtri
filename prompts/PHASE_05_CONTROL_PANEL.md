# PHASE 05 — Trang điều khiển `/control`

## Mục tiêu
Tạo một control panel nhỏ, không phải CMS.

## 1. Authentication
- Không hard-code password trong JS.
- Password trong `.env`.
- Login gửi backend.
- Backend cấp session/token phù hợp.
- Cookie HttpOnly + SameSite nếu dùng session cookie.
- Production dùng Secure cookie.
- Có logout.
- Có rate limit login.

Không lưu password control vào localStorage.

## 2. Dashboard
Hiển thị:
- Current state.
- Registered.
- Playing.
- Completed.
- Completion rate.
- Thời gian update gần nhất.

## 3. Nút điều khiển
- MỞ/WAITING
- BẮT ĐẦU → RUNNING
- ĐÓNG NHẬN BÀI → CLOSED
- CÔNG BỐ KẾT QUẢ → RESULT

Mọi chuyển trạng thái:
- gọi API backend
- backend validate
- log timestamp

## 4. Export CSV
Cho tải CSV:
- Hạng
- Họ tên
- Đơn vị
- Điểm
- Tổng câu
- Thời gian
- Started at
- Submitted at

CSV UTF-8 BOM để mở Excel tiếng Việt tốt.

## 5. Reset
Reset là hành động nguy hiểm.

Yêu cầu:
1. chỉ authenticated control.
2. modal cảnh báo.
3. nhập xác nhận, ví dụ `RESET`.
4. backend transaction.
5. không tự động reset khi restart app.
6. có thể backup/export trước.

## 6. Responsive
Control phải dùng được trên:
- điện thoại
- tablet
- laptop

Trên mobile:
- stats dạng 2 cột hoặc 1 cột.
- nút lớn.
- không table rộng.

## Tiêu chí hoàn thành
- Không thể gọi API state/reset nếu chưa auth.
- Login brute-force cơ bản bị rate limit.
- Export CSV đúng thứ tự ranking.
- Reset có xác nhận nhiều bước.
