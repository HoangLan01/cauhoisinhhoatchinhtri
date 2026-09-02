-- =====================================================================
-- KỊCH BẢN TẠO USER ỨNG DỤNG RIÊNG CHO POSTGRESQL (PRODUCTION SECURITY)
-- Không sử dụng postgres superuser trong môi trường chạy thật.
-- =====================================================================

-- 1. Tạo user ứng dụng với mật khẩu mạnh (thay đổi mật khẩu này trong .env)
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'quiz_app_user') THEN
      CREATE ROLE quiz_app_user LOGIN PASSWORD 'ChangeMe_TungThien2025_Secure!';
   END IF;
END
$do$;

-- 2. Cấp quyền kết nối đến database
GRANT CONNECT ON DATABASE quiz_tung_thien TO quiz_app_user;

-- 3. Cấp quyền sử dụng schema public
\c quiz_tung_thien;
GRANT USAGE ON SCHEMA public TO quiz_app_user;

-- 4. Cấp quyền thao tác dữ liệu (SELECT, INSERT, UPDATE, DELETE) trên các bảng cần thiết
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO quiz_app_user;

-- 5. Đảm bảo các bảng tạo mới trong tương lai tự động cấp quyền
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO quiz_app_user;

-- Thu hồi mọi quyền DDL/DROP nguy hiểm khỏi user ứng dụng
REVOKE CREATE ON SCHEMA public FROM quiz_app_user;
