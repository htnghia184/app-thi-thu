-- ============================================================
-- 012_passage_prep_seconds.sql
-- Thêm thời gian CHUẨN BỊ (giây) cho từng passage/task.
-- Dùng cho đề Speaking theo luồng thi thật VSTEP:
--   Phase 1 (Preparation): hiển thị đề + đếm ngược prep_seconds (mặc định 60s),
--     chưa ghi âm, nút mic bị khóa.
--   Phase 2 (Recording): hết giờ chuẩn bị → beep "Bắt đầu nói!" → tự bật
--     ghi âm trong duration_seconds → hết giờ tự dừng, tự upload, tự chuyển phần kế.
--
-- Gộp luôn duration_seconds (IF NOT EXISTS) phòng trường hợp chưa chạy 011.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
-- ============================================================

ALTER TABLE public.passages
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS prep_seconds INTEGER;

-- Kiểm tra nhanh:
-- SELECT exam_id, passage_number, title, duration_seconds, prep_seconds FROM public.passages ORDER BY exam_id, passage_number LIMIT 10;
