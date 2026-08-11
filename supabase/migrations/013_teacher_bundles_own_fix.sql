-- ============================================================
-- 013_teacher_bundles_own_fix.sql
-- FIX: teacher quản lý được bộ mình tạo (kể cả bộ legacy có created_by NULL)
--
-- Trước đây flow tạo bundle KHÔNG gửi created_by lên → bundle của teacher
-- có created_by = NULL → RLS "created_by = auth.uid()" không khớp → teacher
-- không sửa / xóa / giao lớp được. Đã fix code gửi created_by khi tạo.
-- Migration này nới nhẹ policy cho bộ private legacy (created_by NULL):
--   teacher được sửa / xóa bộ private có created_by = NULL (bộ "không chủ")
--   hoặc do chính mình tạo. Không đụng bộ public / hidden / bộ của người khác.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- Chạy sau 012_teacher_bundles.sql. An toàn khi chạy lại nhiều lần.
-- ============================================================

-- UPDATE: teacher sửa được bộ private của mình hoặc bộ private "không chủ"
DROP POLICY IF EXISTS "Teachers can update their exam bundles" ON exam_bundles;
CREATE POLICY "Teachers can update their exam bundles" ON exam_bundles
  FOR UPDATE USING (
    public.get_user_role()::text = 'teacher'
    AND visibility = 'private'
    AND (created_by = auth.uid() OR created_by IS NULL)
  );

-- DELETE: teacher xóa được bộ private của mình hoặc bộ private "không chủ"
DROP POLICY IF EXISTS "Teachers can delete their exam bundles" ON exam_bundles;
CREATE POLICY "Teachers can delete their exam bundles" ON exam_bundles
  FOR DELETE USING (
    public.get_user_role()::text = 'teacher'
    AND visibility = 'private'
    AND (created_by = auth.uid() OR created_by IS NULL)
  );

-- ------------------------------------------------------------
-- Kiểm tra
-- ------------------------------------------------------------
-- SELECT id, title, visibility, created_by FROM exam_bundles ORDER BY created_at DESC;
