-- ============================================================
-- 006_guest_grading.sql
-- GÁN GIÁO VIÊN CHẤM BÀI CHO GUEST LEADS (WRITING/SPEAKING)
-- (gộp từ migration 007 cũ)
--
-- Bổ sung cho bảng exam_leads:
--   + writing_answers   : nội dung bài viết của guest (JSONB: {task_id: text})
--   + assigned_teacher_id : giáo viên được gán chấm bài
--   + grading_status    : unassigned / assigned / graded
--   + grade_score, grade_feedback, graded_by, graded_at
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- Chạy sau 005_guest_leads.sql. An toàn khi chạy lại nhiều lần.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Thêm cột chấm bài vào exam_leads
-- ------------------------------------------------------------
ALTER TABLE exam_leads ADD COLUMN IF NOT EXISTS writing_answers JSONB;
ALTER TABLE exam_leads ADD COLUMN IF NOT EXISTS assigned_teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE exam_leads ADD COLUMN IF NOT EXISTS grading_status TEXT NOT NULL DEFAULT 'unassigned';

-- Ràng buộc trạng thái chấm bài
ALTER TABLE exam_leads DROP CONSTRAINT IF EXISTS exam_leads_grading_status_check;
ALTER TABLE exam_leads ADD CONSTRAINT exam_leads_grading_status_check
  CHECK (grading_status IN ('unassigned', 'assigned', 'graded'));

ALTER TABLE exam_leads ADD COLUMN IF NOT EXISTS grade_score NUMERIC(3,1);
ALTER TABLE exam_leads ADD COLUMN IF NOT EXISTS grade_feedback TEXT DEFAULT '';
ALTER TABLE exam_leads ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE exam_leads ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP WITH TIME ZONE;

-- ------------------------------------------------------------
-- 2. Chỉ mục tìm nhanh theo giáo viên / trạng thái
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS exam_leads_teacher_idx ON exam_leads (assigned_teacher_id);
CREATE INDEX IF NOT EXISTS exam_leads_grading_status_idx ON exam_leads (grading_status);

-- ------------------------------------------------------------
-- 3. Row Level Security
-- ------------------------------------------------------------

-- Admin: được UPDATE lead (gán teacher, sửa trạng thái, chấm điểm)
DROP POLICY IF EXISTS "Admins can update exam leads" ON exam_leads;
CREATE POLICY "Admins can update exam leads" ON exam_leads
  FOR UPDATE USING (public.get_user_role() = 'admin');

-- Thay policy teacher cũ (xem tất cả) bằng policy mới:
-- Teacher chỉ xem lead được GÁN cho mình hoặc MÌNH đã chấm.
DROP POLICY IF EXISTS "Teachers can view exam leads" ON exam_leads;
DROP POLICY IF EXISTS "Teachers can view assigned exam leads" ON exam_leads;
CREATE POLICY "Teachers can view assigned exam leads" ON exam_leads
  FOR SELECT USING (
    public.get_user_role() = 'teacher'
    AND (assigned_teacher_id = auth.uid() OR graded_by = auth.uid())
  );

-- Teacher: được cập nhật (chấm điểm / nhập feedback) lead được gán cho mình
DROP POLICY IF EXISTS "Teachers can update assigned exam leads" ON exam_leads;
CREATE POLICY "Teachers can update assigned exam leads" ON exam_leads
  FOR UPDATE USING (
    public.get_user_role() = 'teacher'
    AND assigned_teacher_id = auth.uid()
  );

-- ------------------------------------------------------------
-- 4. Kiểm tra
-- ------------------------------------------------------------
-- SELECT id, full_name, phone, assigned_teacher_id, grading_status, grade_score, created_at
-- FROM exam_leads ORDER BY created_at DESC;
