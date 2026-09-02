# PHASE 08 — Triển khai VPS production

## Mục tiêu
Deploy an toàn lên VPS hiện có mà không làm ảnh hưởng dịch vụ khác.

## Thông tin
```text
VPS IP: 103.90.227.130
SSH user: root
Domain: cau-hoi.phuongtungthien.vn
```

Không có password/private key trong prompt này.

---

## 1. Preflight
Trước khi cài gì, kiểm tra:
- OS: `cat /etc/os-release`
- CPU/RAM/disk
- service đang chạy
- port 80/443/3000
- Nginx/Apache hiện có
- PostgreSQL hiện có
- Node.js hiện có
- PM2 hiện có
- firewall
- DNS domain đã trỏ về `103.90.227.130`

Không xóa hoặc overwrite config đang chạy.

Backup:
- `/etc/nginx`
- config liên quan nếu sửa

## 2. DNS
Xác nhận:
`cau-hoi.phuongtungthien.vn -> 103.90.227.130`

Chỉ tiếp tục HTTPS khi DNS resolve đúng.

## 3. User deployment
Dù SSH hiện dùng root, production app không nên chạy Node dưới root.

Tạo user/service user phù hợp, ví dụ:
`quizapp`

Source:
`/var/www/quiz-tung-thien`

Permissions tối thiểu cần thiết.

## 4. Node.js
Cài phiên bản LTS.
Không cài dependency dev trong production nếu không cần.

```bash
npm ci --omit=dev
```

## 5. PostgreSQL
Nếu chưa có:
- cài PostgreSQL
- tạo DB `quiz_tung_thien`
- tạo user app riêng
- password mạnh
- chỉ localhost
- migrate schema

Không expose port 5432 public.

## 6. Environment
Tạo `.env` production trên VPS.
Không ghi secrets vào Git.

Ví dụ:
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=...
CONTROL_PASSWORD=...
SESSION_SECRET=...
QUIZ_TITLE=...
PUBLIC_URL=https://cau-hoi.phuongtungthien.vn
```

## 7. PM2
Chạy app bằng PM2.
- process name rõ ràng
- startup
- save
- log rotation nếu phù hợp

Backend bind:
`127.0.0.1:3000`

Không public port 3000 ra ngoài nếu không cần.

## 8. Nginx
Tạo server block riêng:

- `server_name cau-hoi.phuongtungthien.vn`
- serve/proxy đến `127.0.0.1:3000`
- proxy headers chuẩn
- static cache hợp lý
- API no-cache
- upload/body limit nhỏ
- timeout phù hợp

Test:
`nginx -t`

Chỉ reload sau khi test OK.

## 9. HTTPS
Certbot Let's Encrypt.
Redirect HTTP -> HTTPS.

Test:
- certificate
- auto-renew
- secure cookies

## 10. Firewall
Chỉ cần public:
- SSH
- HTTP
- HTTPS

Port PostgreSQL không public.
Port Node 3000 không public.

Không thay firewall mù quáng; kiểm tra trước để tránh tự khóa SSH.

## 11. Production smoke test
Test:
- `/health`
- `/`
- `/live`
- `/control`
- login control
- start
- submit
- leaderboard
- CSV
- HTTPS
- mobile browser

## 12. Operational commands
Ghi vào README:
- xem log
- restart app
- backup DB
- restore
- deploy update an toàn
- rollback source version

## 13. Không làm
- Không reset DB production.
- Không đổi DNS khác.
- Không ảnh hưởng website chính `phuongtungthien.vn`.
- Không dùng root để chạy Node lâu dài.
- Không mở PostgreSQL ra Internet.

## Tiêu chí hoàn thành
- Domain HTTPS hoạt động.
- Node chạy non-root.
- PostgreSQL chỉ local.
- PM2 tự restart.
- Nginx config test OK.
- Không ảnh hưởng service khác trên VPS.
