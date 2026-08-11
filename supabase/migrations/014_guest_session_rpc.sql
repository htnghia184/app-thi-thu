-- ============================================================
-- 014_guest_session_rpc.sql
-- FIX: guest gửi thông tin khi thi xong bộ bị lỗi "Không thể gửi thông tin"
--
-- Nguyên nhân: guest_sessions chỉ có policy INSERT (anon) và SELECT
-- (admin/teacher). Flow JS dùng insert().select() → PostgREST cần policy
-- SELECT để trả dòng vừa chèn, guest (anon) không có → insert thành công
-- nhưng đọc lại fail → báo lỗi.
--
-- Fix: RPC SECURITY DEFINER tạo session và trả về dòng đã chèn (bỏ qua RLS),
-- cùng pattern với get_guest_session_result.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- Chạy sau 010_exam_bundles.sql. An toàn khi chạy lại nhiều lần.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_guest_session(
  p_full_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_passcode TEXT,
  p_bundle_id UUID
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  passcode TEXT,
  bundle_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session guest_sessions%ROWTYPE;
BEGIN
  INSERT INTO guest_sessions (full_name, phone, email, passcode, bundle_id)
  VALUES (p_full_name, p_phone, COALESCE(p_email, ''), p_passcode, p_bundle_id)
  RETURNING * INTO v_session;

  RETURN QUERY
    SELECT v_session.id, v_session.full_name, v_session.phone, v_session.email,
           v_session.passcode, v_session.bundle_id, v_session.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_guest_session(TEXT, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;

-- ------------------------------------------------------------
-- Kiểm tra
-- ------------------------------------------------------------
-- SELECT * FROM public.create_guest_session('Test', '0900000000', '', 'TEST-0001', NULL);
