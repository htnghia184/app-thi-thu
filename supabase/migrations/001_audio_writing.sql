-- ==========================================================
-- 001_audio_writing.sql
-- Audio columns + Writing submissions & grading
-- (gộp từ migration 002 cũ)
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run.
-- Chạy sau schema.sql. An toàn khi chạy lại nhiều lần.
-- ==========================================================

-- 1. Add audio columns to passages table
ALTER TABLE passages ADD COLUMN IF NOT EXISTS audio_url TEXT DEFAULT '';
ALTER TABLE passages ADD COLUMN IF NOT EXISTS audio_duration INTEGER DEFAULT 0;

-- 2. Writing submissions table
CREATE TABLE IF NOT EXISTS writing_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE NOT NULL,
  task_id INTEGER NOT NULL,
  task_type TEXT NOT NULL,
  content TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Writing grades table
CREATE TABLE IF NOT EXISTS writing_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES writing_submissions(id) ON DELETE CASCADE NOT NULL,
  grader_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  score NUMERIC(3, 1) NOT NULL,
  feedback TEXT DEFAULT '',
  criteria_scores JSONB DEFAULT '{}',
  is_ai BOOLEAN DEFAULT FALSE NOT NULL,
  graded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(submission_id)
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_writing_submissions_user_id ON writing_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_writing_submissions_exam_id ON writing_submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_writing_grades_submission_id ON writing_grades(submission_id);

-- 5. Enable RLS
ALTER TABLE writing_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_grades ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for writing_submissions

-- Students can insert their own submissions
CREATE POLICY "Students can insert own submissions" ON writing_submissions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.get_user_role()::text = 'student'
  );

-- Students can view their own submissions
CREATE POLICY "Students can view own submissions" ON writing_submissions
  FOR SELECT USING (auth.uid() = user_id);

-- Teachers can view submissions of students in their classes
CREATE POLICY "Teachers can view students submissions" ON writing_submissions
  FOR SELECT USING (
    public.get_user_role()::text = 'teacher'
    AND EXISTS (
      SELECT 1 FROM class_students cs
      JOIN class_teachers ct ON cs.class_id = ct.class_id
      WHERE cs.student_id = writing_submissions.user_id
        AND ct.teacher_id = auth.uid()
    )
  );

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions" ON writing_submissions
  FOR SELECT USING (public.get_user_role()::text = 'admin');

-- 7. RLS Policies for writing_grades

-- Teachers can insert/update grades for their students
CREATE POLICY "Teachers can manage grades" ON writing_grades
  FOR ALL USING (
    public.get_user_role()::text = 'teacher'
    AND EXISTS (
      SELECT 1 FROM writing_submissions ws
      JOIN class_students cs ON cs.student_id = ws.user_id
      JOIN class_teachers ct ON ct.class_id = cs.class_id
      WHERE ws.id = writing_grades.submission_id
        AND ct.teacher_id = auth.uid()
    )
  );

-- Admins can manage all grades
CREATE POLICY "Admins can manage all grades" ON writing_grades
  FOR ALL USING (public.get_user_role()::text = 'admin');

-- Students can view their own grades
CREATE POLICY "Students can view own grades" ON writing_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM writing_submissions
      WHERE writing_submissions.id = writing_grades.submission_id
        AND writing_submissions.user_id = auth.uid()
    )
  );
