-- ============================================================
-- 011_bundle_assignments.sql
-- GÁN BỘ ĐỀ CHO LỚP (THI GIỮA KỲ / CUỐI KỲ)
--
-- bundle_assignments: nối 1 bộ đề (exam_bundles) + 1 lớp (classes)
-- + deadline. Chỉ student trong lớp được giao thấy và thi được bộ đó
-- (kể cả khi bundle đang ở trạng thái 'hidden' / 'private').
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- Chạy sau 010_exam_bundles.sql. An toàn khi chạy lại nhiều lần.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Bảng bundle_assignments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bundle_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID REFERENCES exam_bundles(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,                -- VD: "Thi giữa kỳ - Reading"
  description TEXT DEFAULT '',
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bundle_assignments_bundle_id ON bundle_assignments(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_assignments_class_id ON bundle_assignments(class_id);

-- ------------------------------------------------------------
-- 2. Row Level Security
-- ------------------------------------------------------------
ALTER TABLE bundle_assignments ENABLE ROW LEVEL SECURITY;

-- Admin: toàn quyền
DROP POLICY IF EXISTS "Admins can manage bundle_assignments" ON bundle_assignments;
CREATE POLICY "Admins can manage bundle_assignments" ON bundle_assignments
  FOR ALL USING (public.get_user_role()::text = 'admin');

-- Teacher: quản lý assignment trong lớp mình dạy
DROP POLICY IF EXISTS "Teachers can manage bundle assignments in their classes" ON bundle_assignments;
CREATE POLICY "Teachers can manage bundle assignments in their classes" ON bundle_assignments
  FOR ALL USING (
    public.get_user_role()::text = 'teacher'
    AND EXISTS (
      SELECT 1 FROM class_teachers
      WHERE class_id = bundle_assignments.class_id AND teacher_id = auth.uid()
    )
  );

-- Student: chỉ xem được assignment của lớp mình
DROP POLICY IF EXISTS "Students can view their bundle assignments" ON bundle_assignments;
CREATE POLICY "Students can view their bundle assignments" ON bundle_assignments
  FOR SELECT USING (
    public.get_user_role()::text = 'student'
    AND EXISTS (
      SELECT 1 FROM class_students
      WHERE class_id = bundle_assignments.class_id AND student_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 3. Mở rộng SELECT trên exam_bundles:
--    student trong lớp được giao bộ đề phải đọc được bộ đó
--    (kể cả 'hidden'/'private'), để có thể vào thi cuối kỳ/giữa kỳ.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Students can view bundles assigned to their classes" ON exam_bundles;
CREATE POLICY "Students can view bundles assigned to their classes" ON exam_bundles
  FOR SELECT USING (
    public.get_user_role()::text = 'student'
    AND EXISTS (
      SELECT 1 FROM bundle_assignments ba
      JOIN class_students cs ON cs.class_id = ba.class_id AND cs.student_id = auth.uid()
      WHERE ba.bundle_id = exam_bundles.id
    )
  );

-- ------------------------------------------------------------
-- 4. Kiểm tra
-- ------------------------------------------------------------
-- SELECT id, bundle_id, class_id, title, deadline FROM bundle_assignments;
