-- ============================================================
-- check_database_state.sql (v2)
-- FILE CHẨN ĐOÁN — KHÔNG THAY ĐỔI DỮ LIỆU, CHỈ ĐỂ XEM.
-- Chạy 1 query duy nhất → ra 1 bảng kết quả duy nhất, dễ đọc.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
-- Cột "ket_qua": OK = chuẩn, FAIL = cần xử lý trước khi chạy
-- migration 006/007.
-- ============================================================

WITH checks AS (
  -- 1. BẢNG QUAN TRỌNG CÓ TỒN TẠI KHÔNG
  SELECT 10 AS thu_tu, '1. Bang profiles' AS noi_dung,
         to_regclass('public.profiles') IS NOT NULL AS ok, '' AS chi_tiet
  UNION ALL SELECT 11, '1. Bang exams', to_regclass('public.exams') IS NOT NULL, ''
  UNION ALL SELECT 12, '1. Bang exam_leads', to_regclass('public.exam_leads') IS NOT NULL, ''
  UNION ALL SELECT 13, '1. Bang writing_submissions', to_regclass('public.writing_submissions') IS NOT NULL, 'Neu FAIL: migration 007 se loi CREATE POLICY. Phai bao lai de sua.'
  UNION ALL SELECT 14, '1. Bang speaking_submissions', to_regclass('public.speaking_submissions') IS NOT NULL, 'Neu FAIL: migration 007 se loi CREATE POLICY. Phai bao lai de sua.'
  UNION ALL SELECT 15, '1. Bang writing_grades', to_regclass('public.writing_grades') IS NOT NULL, ''
  UNION ALL SELECT 16, '1. Bang speaking_grades', to_regclass('public.speaking_grades') IS NOT NULL, ''

  -- 2. CÁC CỘT CHẤM BÀI TRONG exam_leads (migration 006 đã chạy chưa)
  UNION ALL SELECT 20, '2. exam_leads.writing_answers', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='exam_leads' AND column_name='writing_answers'), 'Chua chay migration 006.'
  UNION ALL SELECT 21, '2. exam_leads.assigned_teacher_id', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='exam_leads' AND column_name='assigned_teacher_id'), 'Chua chay migration 006.'
  UNION ALL SELECT 22, '2. exam_leads.grading_status', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='exam_leads' AND column_name='grading_status'), 'Chua chay migration 006.'
  UNION ALL SELECT 23, '2. exam_leads.passcode', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='exam_leads' AND column_name='passcode'), 'Chua chay migration 005.'

  -- 3. TRIGGER TẠO PROFILE KHI TẠO USER — BẮT BUỘC PHẢI CÓ
  UNION ALL SELECT 30, '3. Trigger auth.on_auth_user_created',
         EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid=c.oid JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='auth' AND t.tgname='on_auth_user_created'),
         'Neu FAIL: tao user tu app se KHONG co profiles (login loi). Phai chay trigger trong schema.sql truoc.'

  -- 4. HÀM RLS BẮT BUỘC
  UNION ALL SELECT 40, '4. Ham public.get_user_role()', to_regprocedure('public.get_user_role()') IS NOT NULL, 'Neu FAIL: moi policy RLS se loi.'

  -- 5. EMAIL CỦA BẠN ĐÃ XÁC NHẬN CHƯA
  UNION ALL SELECT 50, '5. Trigger - (xem dong email trong auth.users)', true, (SELECT string_agg(email || ' : ' || CASE WHEN email_confirmed_at IS NOT NULL THEN 'OK' ELSE 'CHUA XAC NHAN' END, '; ') FROM auth.users)

  -- 6. SỐ BẢN GHI HIỆN CÓ
  UNION ALL SELECT 60, '6. So luong bang ghi', true, (SELECT 'profiles=' || COUNT(*) FROM public.profiles)
  UNION ALL SELECT 61, '6. So luong bang ghi', true, (SELECT 'exams=' || COUNT(*) FROM public.exams)
  UNION ALL SELECT 62, '6. So luong bang ghi', true, (SELECT 'exam_leads=' || COUNT(*) FROM public.exam_leads)
  UNION ALL SELECT 63, '6. So luong bang ghi', true, (SELECT 'exam_results=' || COUNT(*) FROM public.exam_results)

  -- 7. PHÂN BỐ ROLE
  UNION ALL SELECT 70, '7. Role trong profiles', true, (SELECT string_agg(role || '=' || cnt, ', ') FROM (SELECT role, COUNT(*) AS cnt FROM public.profiles GROUP BY role) t)

  -- 8. POLICY HIỆN CÓ TRÊN exam_leads
  UNION ALL SELECT 80, '8. Policy tren exam_leads', true, COALESCE((SELECT string_agg(policyname, '; ') FROM pg_policies WHERE schemaname='public' AND tablename='exam_leads'), '(chua co policy nao)')
)
SELECT noi_dung,
       CASE WHEN ok THEN 'OK' ELSE 'FAIL' END AS ket_qua,
       chi_tiet
FROM checks
ORDER BY thu_tu;
