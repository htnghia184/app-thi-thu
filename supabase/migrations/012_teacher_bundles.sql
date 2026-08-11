-- ============================================================
-- 012_teacher_bundles.sql
-- CHO GIÁO VIÊN QUẢN LÝ BỘ ĐỀ (CHỈ Ở CHẾ ĐỘ PRIVATE)
--
-- Giáo viên được phép:
--   - Tạo bộ đề, nhưng CHỈ ở trạng thái 'private' (Nội bộ).
--     Không được để 'public' (Công khai) hay 'hidden' (Ẩn hoàn toàn).
--   - Sửa / xóa / giao lớp cho NHỮNG BỘ DO CHÍNH MÌNH TẠO.
-- Admin giữ nguyên toàn quyền.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- Chạy sau 010_exam_bundles.sql. An toàn khi chạy lại nhiều lần.
-- ============================================================

-- INSERT: teacher tạo bộ private
DROP POLICY IF EXISTS "Teachers can insert exam bundles" ON exam_bundles;
CREATE POLICY "Teachers can insert exam bundles" ON exam_bundles
  FOR INSERT WITH CHECK (
    public.get_user_role()::text = 'teacher'
    AND visibility = 'private'
  );

-- UPDATE: teacher chỉ sửa được bộ của mình và không được đổi khỏi 'private'
-- (WITH CHECK mặc định = USING, nên dòng mới phải vẫn là 'private')
DROP POLICY IF EXISTS "Teachers can update their exam bundles" ON exam_bundles;
CREATE POLICY "Teachers can update their exam bundles" ON exam_bundles
  FOR UPDATE USING (
    public.get_user_role()::text = 'teacher'
    AND created_by = auth.uid()
    AND visibility = 'private'
  );

-- DELETE: teacher chỉ xóa được bộ của mình
DROP POLICY IF EXISTS "Teachers can delete their exam bundles" ON exam_bundles;
CREATE POLICY "Teachers can delete their exam bundles" ON exam_bundles
  FOR DELETE USING (
    public.get_user_role()::text = 'teacher'
    AND created_by = auth.uid()
  );

-- ------------------------------------------------------------
-- Kiểm tra
-- ------------------------------------------------------------
-- SELECT id, title, visibility, created_by FROM exam_bundles;
