# PHASE 04 — Màn hình trình chiếu `/live`

## Mục tiêu
Tạo màn hình hiển thị tại hội trường/máy chiếu, cập nhật gần realtime nhưng không cần WebSocket.

## 1. Cơ chế cập nhật
Dùng polling:
- `GET /api/live`
- interval mặc định 2 giây
- nếu tab hidden có thể giảm polling
- request lỗi phải retry nhẹ nhàng
- không spam console

Không dùng WebSocket nếu chưa thật sự cần.

## 2. Các trạng thái

### WAITING
Hiển thị:
- Tên chương trình.
- QR code truy cập `https://cau-hoi.phuongtungthien.vn`
- URL dạng text lớn.
- Số người đã sẵn sàng/tham gia nếu có.
- Hướng dẫn ngắn.

### RUNNING
Không nên công bố Top 10 chi tiết nếu Ban tổ chức muốn giữ cao trào.

Hiển thị:
- Tổng tham gia.
- Đang làm.
- Hoàn thành.
- % hoàn thành.
- Progress bar.
- Có thể hiển thị số người đạt 20/20 nhưng cân nhắc không tiết lộ quá nhiều.

### CLOSED
Hiển thị:
- Đã đóng nhận bài.
- Đang tổng hợp kết quả.
- Thống kê cuối.

### RESULT
Hiển thị:
- Top 10.
- Top 3 được nhấn mạnh.
- Điểm.
- Thời gian.
- Đơn vị.
- Tổng số hoàn thành.

## 3. Responsive
Mặc dù chủ yếu là máy chiếu, vẫn phải responsive.

### 1920×1080
- Nội dung phải đọc được từ xa.
- Không dùng font nhỏ.
- Top 10 vừa một màn hình nếu có thể.

### 1366×768
- Không bị tràn đáy.
- Có thể giảm khoảng cách hoặc số dòng phụ.

### Tablet/mobile
- Chuyển leaderboard từ table sang card/list.
- Không scroll ngang.

## 4. Animation
Chỉ dùng animation nhẹ:
- số liệu count-up
- chuyển trạng thái fade
- highlight thay đổi rank nhẹ

Không:
- animation liên tục gây mất tập trung
- hiệu ứng quá màu mè

## 5. Leaderboard
Sort hoàn toàn dựa server.
Frontend không tự quyết định ranking.

Format duration:
- dưới 1 giờ: `mm:ss`
- có thể có phần thập phân nếu cần tie-break nhưng mặc định không cần hiển thị.

## 6. QR
QR phải dẫn đúng domain production.
Nếu domain chưa sẵn sàng ở local, cấu hình URL qua env/config backend.

## 7. Fullscreen
Thêm nút hoặc hướng dẫn để vào fullscreen, nhưng không phụ thuộc fullscreen API để hoạt động.

## Tiêu chí hoàn thành
- Polling ổn định.
- State đổi thì UI đổi trong tối đa ~2–3 giây.
- Top 10 không nhảy layout khó chịu.
- Hiển thị đẹp ở 1920×1080 và 1366×768.
