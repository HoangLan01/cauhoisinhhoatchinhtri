# PHASE 09 — Kiểm thử nghiệm thu trước sự kiện

## Mục tiêu
Tạo checklist cuối để hệ thống có thể dùng thật tại hội trường.

## 1. Nội dung
- Bộ questions.json cuối đã được validate.
- Đúng tổng số câu.
- Không trùng id.
- Mỗi câu đúng 1 đáp án đúng.
- Giải thích đầy đủ.
- Không lỗi chính tả nghiêm trọng.
- Không có đáp án đúng lộ ra frontend.

## 2. Người chơi
Kiểm tra 3 thiết bị thật:
- Android
- iPhone
- Laptop

Các thao tác:
- nhập tên
- chọn đơn vị
- start
- làm bài
- quay lại
- refresh
- submit
- result

## 3. Tablet
Nếu có iPad/tablet, test trực tiếp.

## 4. Live
Kết nối laptop trình chiếu.
Test:
- 1920×1080
- full screen
- QR đủ lớn để quét từ khoảng cách phù hợp
- font Top 10 đủ lớn
- số liệu cập nhật
- trạng thái đổi đúng

## 5. Control
Test trên máy riêng của BTC:
- login
- đổi state
- export
- logout
- không reset nhầm

## 6. Dry run
Tạo ít nhất 20–50 người chơi giả/test.
Chạy quy trình như sự kiện thật:
- WAITING
- RUNNING
- người chơi submit
- CLOSED
- RESULT
- export

Sau dry run:
- export test
- reset dữ liệu test
- xác nhận DB sạch trước sự kiện

## 7. Load test production có kiểm soát
Không phá dữ liệu thật.

Nếu test production:
- dùng DB/test mode hoặc reset sau xác nhận
- chạy ngoài thời gian sử dụng
- kiểm tra CPU/RAM/log

## 8. Backup
Ngay trước sự kiện:
- backup DB/schema
- backup source/config
- xác nhận PM2
- xác nhận Nginx
- xác nhận SSL
- xác nhận disk free

## 9. Mạng hội trường
Rủi ro lớn không chỉ là VPS mà còn là:
- Wi-Fi
- 4G/5G
- DNS
- Internet hội trường

Khuyến nghị:
- người chơi ưu tiên dùng 4G/5G nếu Wi-Fi hội trường yếu.
- BTC có ít nhất 1 hotspot dự phòng.
- laptop trình chiếu có mạng ổn định.
- mở sẵn `/live` và `/control`.

## 10. Kịch bản sự cố
Chuẩn bị:
- restart PM2 nhanh
- check Nginx
- check PostgreSQL
- check disk
- check DNS
- rollback version
- CSV export sau sự kiện

## 11. Acceptance checklist
Chỉ đánh dấu READY khi:
- [ ] HTTPS OK
- [ ] 500-user load test OK
- [ ] submit double-click safe
- [ ] ranking đúng
- [ ] no answer leak
- [ ] mobile responsive
- [ ] tablet responsive
- [ ] laptop responsive
- [ ] live projector responsive
- [ ] control protected
- [ ] CSV export OK
- [ ] backup OK
- [ ] dry run OK
- [ ] questions JSON final validated

## Kết quả cuối phase
Tạo `FINAL_READINESS_REPORT.md` gồm:
- version/deploy commit
- ngày kiểm thử
- cấu hình VPS
- kết quả load test
- lỗi còn tồn tại
- kết luận READY / NOT READY
