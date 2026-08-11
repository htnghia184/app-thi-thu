-- ============================================================
-- 013_guest_speaking_storage.sql
-- 1) Cho phép guest (không tài khoản) LƯU ĐƯỢC bài Speaking:
--    - Cột speaking_audio (JSONB) trên exam_leads — giống writing_answers,
--      teacher/admin chấm ở tab Guest Grading.
--    - Storage policy cho anon upload audio lên bucket exam-audio (path guest/...).
-- 2) Storage policies cho ADMIN quản lý storage ở tab Database:
--    - List/xem file (SELECT public) + xóa file.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
-- ============================================================

-- 1. Cột lưu audio speaking của guest (mỗi phần là 1 object trong mảng JSON)
ALTER TABLE public.exam_leads
  ADD COLUMN IF NOT EXISTS speaking_audio JSONB;

-- 2. Storage: đảm bảo bucket exam-audio tồn tại (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('exam-audio', 'exam-audio', true, 52428800)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 3. Policy: guest (anon) + authenticated được upload audio
DROP POLICY IF EXISTS "Public upload speaking audio" ON storage.objects;
CREATE POLICY "Public upload speaking audio" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'exam-audio');

-- 4. Policy: mọi người đọc được audio (public)
DROP POLICY IF EXISTS "Public read speaking audio" ON storage.objects;
CREATE POLICY "Public read speaking audio" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'exam-audio');

-- 5. Policy: admin được phép xóa file (quản lý storage)
DROP POLICY IF EXISTS "Admin delete speaking audio" ON storage.objects;
CREATE POLICY "Admin delete speaking audio" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'exam-audio' AND public.get_user_role() = 'admin');

-- Kiểm tra nhanh:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'exam_leads' AND column_name = 'speaking_audio';
-- SELECT id, name, public FROM storage.buckets WHERE id = 'exam-audio';
