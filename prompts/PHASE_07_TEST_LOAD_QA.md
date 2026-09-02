# PHASE 07 — QA + Load Test 300–1000 người

## Mục tiêu
Chứng minh hệ thống đủ ổn định cho >300 người làm gần đồng thời.

## 1. Functional QA
Test end-to-end:
1. WAITING
2. người dùng nhập tên/đơn vị
3. RUNNING
4. start
5. trả lời
6. refresh giữa bài
7. tiếp tục
8. submit
9. result
10. live stats cập nhật
11. RESULT
12. leaderboard đúng

## 2. Edge cases
- tên quá dài
- ký tự tiếng Việt
- emoji/ký tự đặc biệt
- organization invalid
- bỏ trống câu
- submit 2 lần
- refresh ngay lúc submit
- mất mạng vài giây
- request timeout
- attempt invalid
- state đổi khi đang thi
- người chơi vào muộn
- CLOSED rồi submit

Business rule chưa rõ thì chọn rule hợp lý nhất và ghi rõ trong README.

## 3. Ranking tests
Tạo dữ liệu giả:
- cùng điểm, khác duration
- cùng score và duration
- 20/20 chậm hơn 19/20 nhanh
- nhiều trăm record

Đảm bảo:
`score DESC, duration_ms ASC, submitted_at ASC`

## 4. Responsive QA
Test DevTools:
- 360×800
- 390×844
- 768×1024
- 1024×768
- 1366×768
- 1920×1080

Kiểm tra:
- no overlap
- no horizontal overflow
- touch target
- font
- leaderboard
- quiz button
- long Vietnamese question

## 5. Load test tool
Ưu tiên `k6` hoặc `autocannon`.

Tạo script mô phỏng:
- 300 VU
- 500 VU
- 1000 VU

Không chỉ spam `/health`.

Mô phỏng luồng:
1. start
2. pause random giống người đọc câu
3. submit
4. một số request live riêng

Do 20 câu thực tế được làm ở browser, load test không cần gửi 20 request/câu.

## 6. Spike test
Mô phỏng 300–500 người submit trong cửa sổ thời gian ngắn.

Đây là case quan trọng nhất.

## 7. Metrics cần ghi
- success rate
- error rate
- p50
- p95
- p99
- requests/sec
- CPU/RAM VPS hoặc local
- PostgreSQL connections
- DB locks/errors

Mục tiêu tham khảo:
- Không lỗi 5xx trong tải mục tiêu.
- p95 submit hợp lý, ưu tiên <1s nếu VPS và mạng cho phép.
- Không exhausted DB pool.
- Không duplicate submit.

## 8. Fix
Nếu lỗi:
- ưu tiên tối ưu query/index
- pool size
- avoid unnecessary DB queries
- cache questions trong memory
- live endpoint query nhẹ

Không chuyển sang Redis/WebSocket/microservice trừ khi có bằng chứng thật sự cần.

## Tiêu chí hoàn thành
- 500 user scenario chạy ổn.
- Có báo cáo ngắn kết quả test.
- Có danh sách bottleneck và fix nếu có.
