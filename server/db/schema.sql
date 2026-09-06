-- =============================================================================
-- HỆ THỐNG THI TRẮC NGHIỆM PHƯỜNG TÙNG THIỆN - DATABASE SCHEMA
-- =============================================================================

-- Kích hoạt extension hỗ trợ sinh UUID nếu cần (PostgreSQL 13+ đã có sẵn gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Bảng quản lý trạng thái cuộc thi (chỉ duy nhất 1 dòng cấu hình id = 1)
CREATE TABLE IF NOT EXISTS quiz_state (
    id INT PRIMARY KEY DEFAULT 1,
    state VARCHAR(20) NOT NULL DEFAULT 'WAITING',
    title VARCHAR(255) NOT NULL DEFAULT 'Hội thi Trắc nghiệm Kiến thức — Phường Tùng Thiện',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_single_row CHECK (id = 1),
    CONSTRAINT chk_valid_state CHECK (state IN ('WAITING', 'RUNNING', 'CLOSED', 'RESULT'))
);

-- Khởi tạo dòng trạng thái mặc định nếu chưa có
INSERT INTO quiz_state (id, state, title, updated_at)
VALUES (1, 'RUNNING', 'Hội thi Trắc nghiệm Kiến thức — Phường Tùng Thiện', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Bảng lưu trữ lượt thi của thí sinh
CREATE TABLE IF NOT EXISTS attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMPTZ NULL,
    score INT NULL,
    duration_ms BIGINT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS',
    answers JSONB NULL,
    client_fingerprint VARCHAR(255) NULL,
    current_score INT NOT NULL DEFAULT 0,
    answered_count INT NOT NULL DEFAULT 0,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_attempt_status CHECK (status IN ('IN_PROGRESS', 'SUBMITTED'))
);

-- Chỉ mục kiểm tra trùng lặp thí sinh (1 người chỉ 1 lượt thi)
CREATE INDEX IF NOT EXISTS idx_attempts_candidate_unique 
ON attempts (LOWER(TRIM(full_name)), organization);

-- Chỉ mục tối ưu hóa truy vấn bảng xếp hạng chính thức (Leaderboard sau khi nộp bài)
-- Tiêu chí: 1. Điểm cao nhất (score DESC) -> 2. Thời gian ngắn nhất (duration_ms ASC) -> 3. Nộp sớm nhất (submitted_at ASC)
CREATE INDEX IF NOT EXISTS idx_attempts_leaderboard 
ON attempts (score DESC, duration_ms ASC, submitted_at ASC) 
WHERE status = 'SUBMITTED';

-- Chỉ mục tối ưu hóa bảng Đua Top thời gian thực trong lúc thi (Live Race Leaderboard)
CREATE INDEX IF NOT EXISTS idx_attempts_live_race
ON attempts (status, current_score DESC, answered_count DESC, last_active_at ASC);

-- Chỉ mục phụ trợ thống kê và tra cứu
CREATE INDEX IF NOT EXISTS idx_attempts_status ON attempts (status);
CREATE INDEX IF NOT EXISTS idx_attempts_submitted_at ON attempts (submitted_at);
CREATE INDEX IF NOT EXISTS idx_attempts_started_at ON attempts (started_at);
