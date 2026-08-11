-- ============================================================
-- 010_admin_user_functions_fix.sql
-- FIX: tạo/xóa user KHÔNG phụ thuộc helper GoTrue bản mới
--
-- VẤN ĐỀ:
--   + auth.admin_delete_user(uuid, boolean) KHÔNG TỒN TẠI trên
--     bản Supabase hiện tại → nút xóa học viên/giáo viên báo lỗi
--     "function auth.admin_delete_user(uuid, boolean) does not exist"
--   + auth.admin_create_user(...) có thể cũng không tồn tại.
--
-- FIX:
--   + admin_delete_user: dọn dữ liệu khóa ngoài bị chặn rồi
--     DELETE trực tiếp auth.users (cascade xuống profiles,
--     exam_results, ...)
--   + admin_create_user: ưu tiên dùng helper GoTrue nếu có,
--     không có thì INSERT thủ công vào auth.users + auth.identities.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
-- ============================================================

-- ------------------------------------------------------------
-- 1. HÀM TẠO USER (student / teacher)
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

  BEGIN
    -- Ưu tiên helper GoTrue nếu bản Supabase có
    IF to_regprocedure('auth.admin_create_user(jsonb, text, text, text, boolean, boolean)') IS NOT NULL THEN
      SELECT auth.admin_create_user(
        jsonb_build_object('full_name', p_full_name, 'role', p_role),
        p_email,
        NULL,
        p_password,
        TRUE,
        TRUE
      ) INTO v_uid;
    ELSE
      -- Bản cũ: INSERT thủ công auth.users + auth.identities
      -- (dùng extensions.crypt/gen_salt — bản này không có auth.gen_salt)
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, confirmation_sent_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data, is_super_admin
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated', 'authenticated', p_email,
        extensions.crypt(p_password, extensions.gen_salt('bf')),
        now(), now(), now(), now(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::text[]),
        jsonb_build_object('full_name', p_full_name, 'role', p_role),
        FALSE
      ) RETURNING id INTO v_uid;

      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        v_uid, v_uid, v_uid,
        jsonb_build_object('sub', v_uid::text, 'email', p_email),
        'email', now(), now(), now()
      );
    END IF;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Email da ton tai: %', p_email;
    WHEN insufficient_privilege THEN
      RAISE EXCEPTION 'Khong du quyen thao tac tren auth schema';
  END;

  -- Đảm bảo profile đúng full_name + role (trigger handle_new_user chỉ
  -- đọc raw_user_meta_data; khi dùng helper GoTrue thì full_name/role
  -- nằm trong app_metadata nên profile cũ tạo ra sẽ sai → phải sửa lại)
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (v_uid, p_email, p_full_name, p_role::public.user_role)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

  RETURN v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_user(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 2. HÀM XÓA USER
--    Không dùng auth.admin_delete_user (không tồn tại ở bản này).
--    Dọn FK bị chặn rồi DELETE trực tiếp auth.users.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Chỉ admin mới được xóa tài khoản
  IF public.get_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Permission denied: chi admin moi duoc xoa tai khoan';
  END IF;

  -- Dọn các dòng có khóa ngoài mặc định (RESTRICT) tham chiếu tới user
  DELETE FROM public.class_teachers WHERE teacher_id = p_user_id;
  DELETE FROM public.class_students WHERE student_id = p_user_id;
  DELETE FROM public.assignments WHERE created_by = p_user_id;
  DELETE FROM public.classes WHERE created_by = p_user_id;
  UPDATE public.exams SET created_by = NULL WHERE created_by = p_user_id;

  -- Các cascade tự động (không cần xử lý):
  --   exam_leads.assigned_teacher_id / graded_by → ON DELETE SET NULL
  --   profiles.id                         → ON DELETE CASCADE từ auth.users
  --   exam_results.user_id                → ON DELETE CASCADE từ profiles

  DELETE FROM auth.users WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Khong tim thay user co id %', p_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

-- ------------------------------------------------------------
-- Kiểm tra nhanh:
-- SELECT public.admin_create_user('test@fix.vn', 'password123', 'Người Test', 'teacher');
-- SELECT id, email, full_name, role FROM public.profiles WHERE email = 'test@fix.vn';
-- SELECT public.admin_delete_user(id) FROM public.profiles WHERE email = 'test@fix.vn';
-- ============================================================
