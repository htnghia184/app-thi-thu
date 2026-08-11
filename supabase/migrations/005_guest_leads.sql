-- ============================================================
-- 005_guest_leads.sql
-- BẢNG LƯU THÔNG TIN NGƯỜI THI THỬ (GUEST) — NGUỒN POTENTIAL LEAD
-- Kèm passcode để tra cứu kết quả (sdt + passcode)
-- (gộp từ migration 006 cũ)
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- Chạy sau 004_guest_public_status.sql. An toàn khi chạy lại nhiều lần.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tạo bảng exam_leads
--    Lưu thông tin liên hệ + kết quả thi thử của guest.
--    passcode: mã tra cứu kết quả (khách nhập sdt + passcode để xem điểm).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE SET NULL,
  exam_title TEXT,
  skill_type TEXT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT DEFAULT '',
  passcode TEXT,                     -- mã tra cứu kết quả (VD: "A7K3-9PL2")
  score_raw INTEGER,                 -- số câu đúng (reading/listening)
  score_vstep NUMERIC(3,1),          -- điểm VSTEP scale 10
  total_questions INTEGER,
  time_spent_seconds INTEGER,
  user_answers JSONB,                -- đáp án của thí sinh (nếu có)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Cột passcode cho các bảng đã tạo trước đó (chạy lại an toàn)
ALTER TABLE exam_leads ADD COLUMN IF NOT EXISTS passcode TEXT;

-- Chỉ mục tìm theo thời gian + passcode
CREATE INDEX IF NOT EXISTS exam_leads_created_at_idx ON exam_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS exam_leads_passcode_idx ON exam_leads (passcode);

-- ------------------------------------------------------------
-- 2. Bật Row Level Security
-- ------------------------------------------------------------
ALTER TABLE exam_leads ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 3. Policies
--    - Bất kỳ ai (kể cả anon/guest) đều có thể GHI thông tin liên hệ
--    - Chỉ admin / teacher mới ĐỌC được danh sách leads
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can insert exam leads" ON exam_leads;
CREATE POLICY "Anyone can insert exam leads" ON exam_leads
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view exam leads" ON exam_leads;
CREATE POLICY "Admins can view exam leads" ON exam_leads
  FOR SELECT USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Teachers can view exam leads" ON exam_leads;
CREATE POLICY "Teachers can view exam leads" ON exam_leads
  FOR SELECT USING (public.get_user_role() = 'teacher');

-- ------------------------------------------------------------
-- 4. Hàm tra cứu kết quả cho guest (sdt + passcode)
--    SECURITY DEFINER → chạy với quyền owner, vượt qua RLS.
--    Khách (anon) chỉ tra cứu được khi đúng sdt + passcode.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_guest_result(p_phone TEXT, p_passcode TEXT)
RETURNS SETOF exam_leads
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM exam_leads
  WHERE phone = p_phone AND passcode = p_passcode
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_guest_result(TEXT, TEXT) TO anon, authenticated;

-- ------------------------------------------------------------
-- 5. Kiểm tra
-- ------------------------------------------------------------
-- SELECT id, full_name, phone, passcode, exam_title, score_vstep, created_at
-- FROM exam_leads ORDER BY created_at DESC;
-- SELECT * FROM public.get_guest_result('0901234567', 'A7K3-9PL2');
