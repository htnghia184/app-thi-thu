-- ============================================================
-- 005_guest_public_status.sql
-- THÊM: role guest + trạng thái public/private cho đề thi
-- Cách dùng: mở Supabase Dashboard → SQL Editor → dán toàn bộ file này → Run.
-- (Có thể chạy lại an toàn nhiều lần)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Thêm role 'guest' vào enum user_role (nếu chưa có)
--    Guest = người thi thử không cần tài khoản, không cần gán lớp.
-- ------------------------------------------------------------
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'guest';

-- ------------------------------------------------------------
-- 2. Thêm cột status cho bảng exams
--    'public'  → ai cũng làm được (kể cả guest thi thử miễn phí)
--    'private' → chỉ học viên được giao (assignment) mới làm
-- ------------------------------------------------------------
ALTER TABLE exams ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'private' NOT NULL;

-- Drop constraint cũ rồi tạo lại để có thể chạy lại nhiều lần
ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_status_check;
ALTER TABLE exams ADD CONSTRAINT exams_status_check CHECK (status IN ('public', 'private'));

-- Backfill: đề nào đang is_published = TRUE thì chuyển thành public
UPDATE exams SET status = 'public' WHERE is_published = TRUE AND status = 'private';
UPDATE exams SET status = 'private' WHERE is_published = FALSE AND status = 'public';

-- ------------------------------------------------------------
-- 3. Cập nhật RLS Policies cho đề public
--    Anon (guest chưa đăng nhập) chỉ đọc được đề public + passages + questions
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Students can view published exams" ON exams;
CREATE POLICY "Anyone can view public exams" ON exams
  FOR SELECT USING (status = 'public');

DROP POLICY IF EXISTS "Students can view passages of published exams" ON passages;
CREATE POLICY "Anyone can view passages of public exams" ON passages
  FOR SELECT USING (EXISTS (SELECT 1 FROM exams WHERE id = exam_id AND status = 'public'));

DROP POLICY IF EXISTS "Students can view questions of published exams" ON questions;
CREATE POLICY "Anyone can view questions of public exams" ON questions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM passages
    JOIN exams ON passages.exam_id = exams.id
    WHERE passages.id = questions.passage_id AND exams.status = 'public'
  ));

-- ------------------------------------------------------------
-- 4. Ví dụ tạo tài khoản cho học viên (Admin tạo qua SQL Editor)
--    Đổi email / mật khẩu / họ tên / role trước khi chạy.
--    Trigger handle_new_user tự tạo bản ghi profiles kèm role.
-- ------------------------------------------------------------
-- INSERT INTO auth.users (
--   instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
--   raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
--   confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_exp
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   gen_random_uuid(),
--   'authenticated', 'authenticated',
--   'student@example.com',                          -- email
--   crypt('MatKhau@123', gen_salt('bf')),           -- mật khẩu
--   now(),
--   '{"provider":"email","providers":["email"]}',
--   '{"full_name":"Nguyen Van A","role":"student"}', -- role: student / teacher / admin / guest
--   now(), now(),
--   '', '', '', '', now()
-- );

-- Nếu cần đổi role sau khi tạo:
-- UPDATE public.profiles SET role = 'teacher' WHERE email = 'student@example.com';

-- ------------------------------------------------------------
-- 5. Kiểm tra kết quả
-- ------------------------------------------------------------
-- SELECT id, title, skill_type, status, is_published FROM exams ORDER BY created_at DESC;
