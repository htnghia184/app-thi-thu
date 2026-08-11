-- ============================================================
-- 008_passage_timing.sql
-- Thời lượng cho từng passage/task (đề Speaking)
-- (gộp từ 011_passage_duration.sql + 012_passage_prep_seconds.sql)
--
--   duration_seconds : giới hạn thời gian GHI ÂM — hết giờ hệ thống
--                      tự dừng record, tự chuyển phần tiếp theo.
--   prep_seconds     : thời gian CHUẨN BỊ (mặc định 60s) — hiển thị đề
--                      + đếm ngược, mic bị khóa; hết giờ → beep
--                      "Bắt đầu nói!" → tự bật ghi âm.
-- Các skill khác (reading/listening/writing) để NULL.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
-- Chạy sau 007_admin_tools.sql. An toàn khi chạy lại nhiều lần.
-- ============================================================

ALTER TABLE public.passages
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS prep_seconds INTEGER;

-- Kiểm tra nhanh:
-- SELECT exam_id, passage_number, title, duration_seconds, prep_seconds
-- FROM public.passages ORDER BY exam_id, passage_number LIMIT 10;
