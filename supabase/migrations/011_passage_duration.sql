-- ============================================================
-- 011_passage_duration.sql
-- Thêm thời lượng (giây) cho từng passage/task.
-- Dùng cho đề Speaking: mỗi phần có giới hạn thời gian ghi âm,
-- hết giờ hệ thống tự dừng record và chuyển phần tiếp theo.
-- Các skill khác (reading/listening/writing) để NULL.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
-- ============================================================

ALTER TABLE public.passages
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Kiểm tra nhanh:
-- SELECT exam_id, passage_number, title, duration_seconds FROM public.passages ORDER BY exam_id, passage_number LIMIT 10;
