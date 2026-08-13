-- ============================================================
-- 015_strict_mode.sql
-- CHẾ ĐỘ THI NGHIÊM NGẶT (ANTI-CHEAT) THEO TỪNG BỘ ĐỀ
--
-- Thêm cột strict_mode vào exam_bundles:
--   true  = khi bắt đầu làm bài bất kỳ kỹ năng nào trong bộ →
--           bắt buộc toàn màn hình, chặn mở tab mới / đổi tab /
--           sao chép; sau 3 lần vi phạm tự động nộp bài.
--   false = bộ đề bình thường, không áp dụng anti-cheat.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- Chạy sau 014_guest_session_rpc.sql. An toàn khi chạy lại nhiều lần.
-- ============================================================

ALTER TABLE exam_bundles
  ADD COLUMN IF NOT EXISTS strict_mode BOOLEAN NOT NULL DEFAULT false;

-- ------------------------------------------------------------
-- Kiểm tra
-- ------------------------------------------------------------
-- SELECT id, title, visibility, strict_mode FROM exam_bundles;
