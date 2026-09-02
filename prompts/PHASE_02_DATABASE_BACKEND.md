# PHASE 02 — PostgreSQL + Backend nghiệp vụ Quiz

## Mục tiêu
Hoàn thiện phần nghiệp vụ cốt lõi phía server:
- trạng thái cuộc thi
- tạo lượt chơi
- cấp câu hỏi an toàn
- submit
- tính điểm
- tính thời gian
- kết quả
- leaderboard

## 1. Database schema

Tạo migration/schema SQL.

### Bảng `quiz_state`
Tối thiểu:
- id
- state: WAITING/RUNNING/CLOSED/RESULT
- updated_at

Chỉ cần một row active nếu hệ thống phục vụ một cuộc thi tại một thời điểm.

### Bảng `attempts`
Gợi ý:
- id UUID
- full_name VARCHAR
- organization VARCHAR
- started_at TIMESTAMPTZ
- submitted_at TIMESTAMPTZ NULL
- score INT NULL
- duration_ms BIGINT NULL
- status VARCHAR
- created_at TIMESTAMPTZ
- client_fingerprint optional, không bắt buộc

Tạo index phục vụ leaderboard:
- `score DESC`
- `duration_ms ASC`
- `submitted_at`

Không cần lưu đáp án chi tiết nếu chưa có nhu cầu phân tích. Nếu thấy cần để audit, có thể thêm `answers JSONB`, nhưng giải thích rõ lý do.

## 2. Questions JSON
Tạo file mẫu:
`server/data/questions.json`

Backend có service load và validate JSON.

Phải validate:
- id duy nhất
- có 4 option hợp lệ nếu bài thi quy định 4 đáp án
- `correct` khớp option id
- có `explanation`
- không có dữ liệu rỗng bất thường

## 3. API status
`GET /api/status`

Trả:
- state
- quiz title
- participant counts cơ bản nếu cần

## 4. API start
`POST /api/start`

Input:
```json
{
  "fullName": "Nguyễn Văn A",
  "organization": "Phòng Văn hóa - Xã hội"
}
```

Yêu cầu:
- trim dữ liệu
- validate length
- organization chỉ nhận giá trị cho phép nếu dùng danh sách cố định
- chỉ cho bắt đầu khi state phù hợp
- tạo UUID attempt
- `started_at` dùng thời gian PostgreSQL/server
- trả attemptId + bộ câu hỏi đã sanitized

TUYỆT ĐỐI không trả:
- correct
- explanation

## 5. API resume
`GET /api/attempt/:id`

Cho phép browser refresh và resume.
Không tạo attempt mới nếu localStorage đã có attempt đang hoạt động.

Trả:
- trạng thái attempt
- server status
- startedAt
- nếu chưa submit: dữ liệu cần để tiếp tục
- nếu đã submit: redirect logic phía frontend sang result

## 6. API submit
`POST /api/submit`

Input:
```json
{
  "attemptId": "...",
  "answers": [
    {"questionId": 1, "selected": "A"}
  ]
}
```

Backend:
1. Validate attempt tồn tại.
2. Lock/transaction để tránh submit kép.
3. Kiểm tra chưa submitted.
4. Kiểm tra state có cho submit.
5. Validate question id.
6. Tính score từ file JSON phía server.
7. `submitted_at = server/database time`.
8. `duration_ms = submitted_at - started_at`.
9. Lưu score và duration.
10. Commit.
11. Trả result.

Không nhận score/duration từ frontend.

## 7. Result
`GET /api/result/:id`

Trả:
- fullName
- organization
- score
- totalQuestions
- durationMs
- rank hiện tại
- totalCompleted
- trạng thái bảng xếp hạng

Không trả đáp án đúng nếu chưa RESULT, trừ khi business rule sau này yêu cầu.

## 8. Live API
`GET /api/live`

Trả gọn:
```json
{
  "state": "RUNNING",
  "registered": 320,
  "playing": 85,
  "completed": 235,
  "completionRate": 73.4,
  "top": [...]
}
```

Leaderboard query:
```sql
ORDER BY score DESC, duration_ms ASC, submitted_at ASC
```
`submitted_at` dùng tie-break cuối cùng để kết quả deterministic.

## 9. Organization config
Không hard-code rải rác.

Tạo file config riêng, ví dụ:
`server/data/organizations.json`

Sau này dễ thay.

## 10. Test backend
Tạo test hoặc script kiểm thử tối thiểu:
- start hợp lệ
- start thiếu tên
- submit đúng
- submit sai
- submit lần 2
- attempt không tồn tại
- leaderboard sort đúng
- API không làm lộ `correct`
- API không làm lộ `explanation`

## Tiêu chí hoàn thành
- Database migrate được từ đầu.
- API chạy với PostgreSQL.
- Không có race condition rõ ràng khi submit kép.
- Điểm và thời gian chỉ do backend tính.
- JSON đáp án không lộ qua API.
