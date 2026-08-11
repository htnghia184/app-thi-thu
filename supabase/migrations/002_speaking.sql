-- ==========================================================
-- 002_speaking.sql
-- Speaking submissions & grading
-- (gộp từ migration 003 cũ)
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
-- Chạy sau 001_audio_writing.sql. An toàn khi chạy lại nhiều lần.
-- ==========================================================

-- 1. Speaking submissions table
CREATE TABLE IF NOT EXISTS speaking_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE NOT NULL,
  passage_id INTEGER NOT NULL,
  passage_title TEXT DEFAULT '' NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  transcript TEXT DEFAULT '',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Speaking grades table
CREATE TABLE IF NOT EXISTS speaking_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES speaking_submissions(id) ON DELETE CASCADE NOT NULL,
  grader_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  score NUMERIC(3, 1) NOT NULL,
  feedback TEXT DEFAULT '',
  criteria_scores JSONB DEFAULT '{}',
  is_ai BOOLEAN DEFAULT FALSE NOT NULL,
  graded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(submission_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_speaking_submissions_user_id ON speaking_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_speaking_submissions_exam_id ON speaking_submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_speaking_grades_submission_id ON speaking_grades(submission_id);

-- 4. Enable RLS
ALTER TABLE speaking_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE speaking_grades ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for speaking_submissions

-- Students can insert their own submissions
CREATE POLICY "Students can insert own speaking submissions" ON speaking_submissions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.get_user_role()::text = 'student'
  );

-- Students can view their own submissions
CREATE POLICY "Students can view own speaking submissions" ON speaking_submissions
  FOR SELECT USING (auth.uid() = user_id);

-- Teachers can view submissions of students in their classes
CREATE POLICY "Teachers can view students speaking submissions" ON speaking_submissions
  FOR SELECT USING (
    public.get_user_role()::text = 'teacher'
    AND EXISTS (
      SELECT 1 FROM class_students cs
      JOIN class_teachers ct ON cs.class_id = ct.class_id
      WHERE cs.student_id = speaking_submissions.user_id
        AND ct.teacher_id = auth.uid()
    )
  );

-- Admins can view all speaking submissions
CREATE POLICY "Admins can view all speaking submissions" ON speaking_submissions
  FOR SELECT USING (public.get_user_role()::text = 'admin');

-- 6. RLS Policies for speaking_grades

-- Teachers can insert/update grades for their students
CREATE POLICY "Teachers can manage speaking grades" ON speaking_grades
  FOR ALL USING (
    public.get_user_role()::text = 'teacher'
    AND EXISTS (
      SELECT 1 FROM speaking_submissions ss
      JOIN class_students cs ON cs.student_id = ss.user_id
      JOIN class_teachers ct ON ct.class_id = cs.class_id
      WHERE ss.id = speaking_grades.submission_id
        AND ct.teacher_id = auth.uid()
    )
  );

-- Admins can manage all speaking grades
CREATE POLICY "Admins can manage all speaking grades" ON speaking_grades
  FOR ALL USING (public.get_user_role()::text = 'admin');

-- Students can view their own grades
CREATE POLICY "Students can view own speaking grades" ON speaking_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM speaking_submissions
      WHERE speaking_submissions.id = speaking_grades.submission_id
        AND speaking_submissions.user_id = auth.uid()
    )
  );
