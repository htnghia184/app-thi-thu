-- ============================================================
-- 010_exam_bundles.sql
-- THI THỬ THEO BỘ (4 KỸ NĂNG GOM VÀO 1 SESSION — 1 PASSCODE DUY NHẤT)
--
-- 1. exam_bundles : bộ đề do admin tạo, gom 1-4 đề (public/private).
--    - visibility = 'public'  : mọi người (guest + student) thấy và thi được
--    - visibility = 'private' : chỉ student có tài khoản thấy và thi được (guest không thấy)
--    - visibility = 'hidden'  : ẩn hoàn toàn, chỉ admin thấy trong admin panel
-- 2. guest_sessions : 1 lần để lại thông tin = 1 session = 1 passcode,
--                     gom tất cả exam_leads của các kỹ năng đã thi trong bộ.
-- 3. exam_leads.session_id : liên kết mỗi lead với session.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- Chạy sau 009_guest_speaking_storage.sql. An toàn khi chạy lại nhiều lần.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Bảng exam_bundles (admin quản lý bộ đề)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  exam_ids UUID[] NOT NULL DEFAULT '{}',   -- danh sách exam_id trong bộ (public hoặc private)
  visibility TEXT NOT NULL DEFAULT 'public', -- 'public' | 'private' | 'hidden'
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Nếu đã chạy bản cũ (dùng is_published), thêm cột visibility và đồng bộ dữ liệu
ALTER TABLE exam_bundles ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
ALTER TABLE exam_bundles ADD COLUMN IF NOT EXISTS visibility TEXT;
UPDATE exam_bundles
SET visibility = CASE WHEN is_published THEN 'public' ELSE 'private' END
WHERE visibility IS NULL OR visibility = '';
ALTER TABLE exam_bundles ALTER COLUMN visibility SET DEFAULT 'public';
ALTER TABLE exam_bundles ALTER COLUMN visibility SET NOT NULL;
ALTER TABLE exam_bundles DROP CONSTRAINT IF EXISTS exam_bundles_visibility_check;
ALTER TABLE exam_bundles ADD CONSTRAINT exam_bundles_visibility_check CHECK (visibility IN ('public', 'private', 'hidden'));

CREATE INDEX IF NOT EXISTS exam_bundles_created_at_idx ON exam_bundles (created_at DESC);

-- ------------------------------------------------------------
-- 2. Bảng guest_sessions (1 lần để lại info = 1 passcode gom nhiều lead)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT DEFAULT '',
  passcode TEXT UNIQUE NOT NULL,           -- mã tra cứu duy nhất cho cả bộ
  bundle_id UUID REFERENCES exam_bundles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS guest_sessions_phone_idx ON guest_sessions (phone);
CREATE INDEX IF NOT EXISTS guest_sessions_passcode_idx ON guest_sessions (passcode);

-- Liên kết mỗi lead với session
ALTER TABLE exam_leads ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES guest_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS exam_leads_session_id_idx ON exam_leads (session_id);

-- ------------------------------------------------------------
-- 3. Row Level Security
-- ------------------------------------------------------------
ALTER TABLE exam_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;

-- exam_bundles — SELECT theo visibility:
--   public : mọi người (kể cả guest anon)
--   private: chỉ student/teacher có tài khoản
--   hidden : chỉ admin
DROP POLICY IF EXISTS "Anyone can view published exam bundles" ON exam_bundles;
DROP POLICY IF EXISTS "Anyone can view public exam bundles" ON exam_bundles;
CREATE POLICY "Anyone can view public exam bundles" ON exam_bundles
  FOR SELECT USING (visibility = 'public');

DROP POLICY IF EXISTS "Students and teachers can view private exam bundles" ON exam_bundles;
CREATE POLICY "Students and teachers can view private exam bundles" ON exam_bundles
  FOR SELECT USING (
    visibility = 'private'
    AND auth.role() = 'authenticated'
    AND public.get_user_role() IN ('student', 'teacher')
  );

DROP POLICY IF EXISTS "Admins can view all exam bundles" ON exam_bundles;
CREATE POLICY "Admins can view all exam bundles" ON exam_bundles
  FOR SELECT USING (public.get_user_role() = 'admin');

-- exam_bundles — ghi (admin toàn quyền)
DROP POLICY IF EXISTS "Admins can insert exam bundles" ON exam_bundles;
CREATE POLICY "Admins can insert exam bundles" ON exam_bundles
  FOR INSERT WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can update exam bundles" ON exam_bundles;
CREATE POLICY "Admins can update exam bundles" ON exam_bundles
  FOR UPDATE USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can delete exam bundles" ON exam_bundles;
CREATE POLICY "Admins can delete exam bundles" ON exam_bundles
  FOR DELETE USING (public.get_user_role() = 'admin');

-- guest_sessions: ai cũng tạo được session; chỉ admin/teacher đọc được
DROP POLICY IF EXISTS "Anyone can insert guest sessions" ON guest_sessions;
CREATE POLICY "Anyone can insert guest sessions" ON guest_sessions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view guest sessions" ON guest_sessions;
CREATE POLICY "Admins can view guest sessions" ON guest_sessions
  FOR SELECT USING (public.get_user_role() IN ('admin', 'teacher'));

-- ------------------------------------------------------------
-- 4. RPC: guest tra cứu kết quả cả bộ bằng sdt + passcode
--    SECURITY DEFINER → anon vượt RLS, chỉ thấy khi đúng sdt + passcode.
--    Trả về session kèm toàn bộ leads (các kỹ năng đã thi).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_guest_session_result(p_phone TEXT, p_passcode TEXT)
RETURNS TABLE (
  session_id UUID,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  passcode TEXT,
  bundle_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  leads JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.full_name, s.phone, s.email, s.passcode, s.bundle_id, s.created_at,
         COALESCE(jsonb_agg(l ORDER BY l.created_at), '[]'::jsonb) AS leads
  FROM guest_sessions s
  LEFT JOIN exam_leads l ON l.session_id = s.id
  WHERE s.phone = p_phone AND s.passcode = p_passcode
  GROUP BY s.id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_session_result(TEXT, TEXT) TO anon, authenticated;

-- ------------------------------------------------------------
-- 5. Kiểm tra
-- ------------------------------------------------------------
-- SELECT id, title, exam_ids, visibility FROM exam_bundles;
-- SELECT id, full_name, phone, passcode FROM guest_sessions;
-- SELECT * FROM public.get_guest_session_result('0901234567', 'A7K3-9PL2');
