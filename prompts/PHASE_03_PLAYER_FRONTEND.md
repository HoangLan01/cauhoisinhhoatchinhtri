# PHASE 03 — Giao diện người chơi responsive

## Mục tiêu
Hoàn thiện luồng người chơi từ đăng ký → làm bài → nộp → kết quả.

Thiết kế:
- đơn giản
- hiện đại
- trang trọng
- mobile-first
- thao tác tốt bằng một tay trên điện thoại

## 1. Trang đăng ký `/`
Nội dung:
- Logo/khu vực nhận diện UBND phường Tùng Thiện.
- Tên cuộc thi.
- Mô tả ngắn.
- Input Họ và tên.
- Select Đơn vị công tác.
- Nút “Bắt đầu”.

UX:
- Không cho submit nếu thiếu thông tin.
- Hiển thị lỗi ngay dưới field.
- Nút cao tối thiểu ~44–48px.
- Không zoom bất thường trên iPhone do font input quá nhỏ.
- Enter/keyboard không làm mất dữ liệu.

## 2. Responsive
### Mobile
- 1 cột.
- Card chiếm gần hết chiều ngang.
- Padding hợp lý.
- Không tạo scroll ngang.

### Tablet
- card rộng vừa phải, tối đa khoảng 700–800px.

### Laptop
- form centered.
- background có thể có pattern nhẹ, không gây rối.

## 3. Quiz page
Hiển thị:
- Câu X / tổng số.
- Progress bar.
- Thời gian đã làm hoặc thời gian còn lại nếu sau này cấu hình.
- Nội dung câu hỏi.
- 4 đáp án dạng button/card.
- Nút Câu trước / Câu sau.
- Trạng thái câu đã chọn.
- Nút Nộp bài.

Yêu cầu:
- Không reveal đúng/sai trong khi đang thi.
- Chọn đáp án chỉ lưu local state.
- Không gọi API mỗi lần chọn câu.
- Không gửi từng đáp án riêng lẻ.
- Không lộ `correct`.

## 4. Local persistence
Lưu:
- `attemptId`
- câu trả lời đang chọn
- currentQuestion

vào localStorage/sessionStorage phù hợp.

Khi reload:
- gọi backend kiểm tra attempt
- resume
- không reset startedAt
- không tạo attempt mới

## 5. Submit
Khi bấm Nộp:
- nếu còn câu chưa trả lời, cảnh báo rõ số câu.
- Cho phép nộp dù bỏ trống nếu business rule không cấm.
- Disable nút sau click để chống double click.
- Hiển thị loading.
- Nếu request timeout: kiểm tra lại trạng thái attempt trước khi cho retry để tránh nộp kép.

## 6. Result page
Hiển thị:
- Họ tên
- Đơn vị
- Điểm: `18/20`
- Thời gian: `02:46`
- Xếp hạng hiện tại
- Số người đã hoàn thành
- Ghi chú: xếp hạng có thể thay đổi đến khi cuộc thi kết thúc.

Nếu state RESULT và business rule cho phép:
- có thể hiện giải thích/đáp án sau này.
- Chưa triển khai nếu chưa có yêu cầu.

## 7. Accessibility
- Focus visible.
- Button có aria-label nếu cần.
- Text contrast tốt.
- Không dùng chỉ màu sắc để biểu đạt trạng thái.
- Font dễ đọc.

## 8. Breakpoints bắt buộc test
- 360×800
- 390×844
- 768×1024
- 1024×768
- 1366×768
- 1920×1080

## Tiêu chí hoàn thành
- Toàn bộ luồng chạy thật với API.
- Refresh không mất lượt chơi.
- Submit một lần.
- Không console error.
- Không horizontal overflow.
