-- ============================================================
-- 009_admin_create_user_fix.sql
-- FIX LỖI: profile được tạo sai khi tạo user từ app
--
-- VẤN ĐỀ: hàm public.admin_create_user (migration 008) truyền
-- full_name + role qua app_metadata. Nhưng trigger handle_new_user
-- chỉ đọc raw_user_meta_data (new.raw_user_meta_data->>'full_name' /
-- 'role') nên profile bị tạo ra với full_name = NULL và role = student
-- (kể cả khi tạo teacher).
--
-- FIX: sau khi tạo auth.users, tự INSERT/UPDATE profile với đúng
-- full_name + role. Chạy độc lập, không cần chạy lại 008.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
-- ============================================================

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

  -- FIX QUAN TRỌNG: trigger handle_new_user không đọc được
  -- full_name/role từ app_metadata, nên tự đảm bảo profile đúng.
  -- - Nếu trigger chưa tạo profile → INSERT mới
  -- - Nếu trigger đã tạo (full_name NULL, role student) → UPDATE lại
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
-- Kiểm tra nhanh sau khi chạy:
-- SELECT public.admin_create_user('test@fix.vn', 'password123', 'Người Test', 'teacher');
-- SELECT id, email, full_name, role FROM public.profiles WHERE email = 'test@fix.vn';
-- (phải thấy full_name = 'Người Test', role = teacher)
-- Rồi xóa user test đi nếu không cần:
-- SELECT public.admin_delete_user(id) FROM public.profiles WHERE email = 'test@fix.vn';
-- ============================================================
