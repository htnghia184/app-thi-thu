-- ============================================================
-- 008_admin_tools.sql
-- CÔNG CỤ QUẢN TRỊ: TẠO / XÓA USER + DỌN DẸP DATABASE
--
-- 1) Admin được DELETE trên exam_leads, writing_submissions,
--    speaking_submissions (phục vụ tab Database dọn dẹp dữ liệu)
-- 2) Hàm public.admin_create_user() — admin tạo tài khoản
--    (student / teacher) ngay từ tab Admin, không cần vào SQL Editor
-- 3) Hàm public.admin_delete_user() — admin xóa tài khoản
--    (cascade xuống profiles, exam_results, ...)
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- Chạy SAU file 007_guest_grading.sql. An toàn khi chạy lại nhiều lần.
-- ============================================================

-- ------------------------------------------------------------
-- 1. DELETE policies cho admin (dọn dẹp dữ liệu từ app)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can delete exam leads" ON exam_leads;
CREATE POLICY "Admins can delete exam leads" ON exam_leads
  FOR DELETE USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can delete writing submissions" ON writing_submissions;
CREATE POLICY "Admins can delete writing submissions" ON writing_submissions
  FOR DELETE USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can delete speaking submissions" ON speaking_submissions;
CREATE POLICY "Admins can delete speaking submissions" ON speaking_submissions
  FOR DELETE USING (public.get_user_role() = 'admin');

-- ------------------------------------------------------------
-- 2. Hàm tạo tài khoản (student / teacher) — chỉ admin gọi được.
--    Trả về UUID user vừa tạo.
--    Trigger handle_new_user sẽ tự tạo bản ghi profiles kèm role.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'student'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
BEGIN
  -- Chỉ admin mới được tạo tài khoản
  IF public.get_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Permission denied: chi admin moi duoc tao tai khoan';
  END IF;

  IF p_role NOT IN ('student', 'teacher') THEN
    RAISE EXCEPTION 'Role khong hop le (chi student hoac teacher)';
  END IF;

  IF length(p_password) < 6 THEN
    RAISE EXCEPTION 'Mat khau phai tu 6 ky tu tro len';
  END IF;

  -- Tạo user trong auth.users + auth.identities.
  -- email_confirm = TRUE: user đăng nhập được ngay, không cần xác nhận mail.
  BEGIN
    SELECT auth.admin_create_user(
      jsonb_build_object('full_name', p_full_name, 'role', p_role),
      p_email,
      NULL,
      p_password,
      TRUE,
      TRUE
    ) INTO v_uid;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Email da ton tai: %', p_email;
  END;

  -- LƯU Ý: trigger handle_new_user chỉ đọc raw_user_meta_data (không
  -- đọc được full_name/role từ app_metadata), nên phải tự đảm bảo
  -- profile đúng full_name + role. INSERT mới nếu chưa có, UPDATE lại
  -- nếu trigger đã tạo profile trước đó (role mặc định student).
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (v_uid, p_email, p_full_name, p_role::public.user_role)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

  RETURN v_uid;
END;
$$;

-- Chỉ user đã đăng nhập (admin) được gọi hàm
REVOKE ALL ON FUNCTION public.admin_create_user(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 3. Hàm xóa tài khoản — chỉ admin gọi được.
--    Xóa auth.users (cascade xuống profiles, exam_results...).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Permission denied: chi admin moi duoc xoa tai khoan';
  END IF;

  PERFORM auth.admin_delete_user(p_user_id, TRUE);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

-- ------------------------------------------------------------
-- Kiểm tra nhanh:
-- SELECT public.admin_create_user('teacher@example.com', 'password123', 'Cô Giáo', 'teacher');
-- SELECT public.admin_delete_user('UUID_CUA_USER');
-- ============================================================
