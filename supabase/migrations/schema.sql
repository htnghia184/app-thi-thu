-- ==========================================================
-- E-Master Online Exam Center - Full Schema
-- ==========================================================

-- 1. Custom types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'admin', 'teacher');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Tables
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role user_role DEFAULT 'student' NOT NULL,
  full_name TEXT,
  avatar_url TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  certificates TEXT DEFAULT '',
  target_score TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 60 NOT NULL,
  skill_type TEXT DEFAULT 'reading' NOT NULL,
  is_published BOOLEAN DEFAULT TRUE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS passages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE NOT NULL,
  passage_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  CONSTRAINT unique_passage_number UNIQUE (exam_id, passage_number)
);

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passage_id UUID REFERENCES passages(id) ON DELETE CASCADE NOT NULL,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  CONSTRAINT unique_question_number UNIQUE (passage_id, question_number)
);

CREATE TABLE IF NOT EXISTS exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE NOT NULL,
  score_raw INTEGER NOT NULL,
  score_vstep NUMERIC(3, 1) NOT NULL,
  time_spent_seconds INTEGER NOT NULL,
  user_answers JSONB NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Class management
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS class_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(class_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS class_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(class_id, student_id)
);

-- Assignments: link class + exam with deadline
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add columns that may not exist yet (for existing tables)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS certificates TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_score TEXT DEFAULT '';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS skill_type TEXT DEFAULT 'reading';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- 3. Helper function to check role (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 4. Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Drop all existing policies to allow re-run safely
DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('profiles','exams','passages','questions','exam_results','classes','class_teachers','class_students','assignments')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (public.get_user_role() = 'admin');
CREATE POLICY "Teachers can view students in their classes" ON profiles
  FOR SELECT USING (
    public.get_user_role()::text = 'teacher'
    AND (
      auth.uid() = profiles.id
      OR EXISTS (
        SELECT 1 FROM class_students cs
        JOIN class_teachers ct ON cs.class_id = ct.class_id
        WHERE cs.student_id = profiles.id AND ct.teacher_id = auth.uid()
      )
    )
  );

-- Exams
CREATE POLICY "Admins and teachers can manage exams" ON exams
  FOR ALL USING (public.get_user_role()::text IN ('admin', 'teacher'));
CREATE POLICY "Students can view published exams" ON exams
  FOR SELECT USING (is_published = TRUE);

-- Passages
CREATE POLICY "Admins and teachers can manage passages" ON passages
  FOR ALL USING (public.get_user_role()::text IN ('admin', 'teacher'));
CREATE POLICY "Students can view passages of published exams" ON passages
  FOR SELECT USING (EXISTS (SELECT 1 FROM exams WHERE id = exam_id AND is_published = TRUE));

-- Questions
CREATE POLICY "Admins and teachers can manage questions" ON questions
  FOR ALL USING (public.get_user_role()::text IN ('admin', 'teacher'));
CREATE POLICY "Students can view questions of published exams" ON questions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM passages
    JOIN exams ON passages.exam_id = exams.id
    WHERE passages.id = questions.passage_id AND exams.is_published = TRUE
  ));

-- Exam Results
CREATE POLICY "Users can view their own exam results" ON exam_results
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own exam results" ON exam_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all exam results" ON exam_results
  FOR ALL USING (public.get_user_role() = 'admin');
CREATE POLICY "Teachers can view their students exam results" ON exam_results
  FOR SELECT USING (
    public.get_user_role()::text = 'teacher'
    AND EXISTS (
      SELECT 1 FROM class_students cs
      JOIN class_teachers ct ON cs.class_id = ct.class_id
      WHERE cs.student_id = exam_results.user_id AND ct.teacher_id = auth.uid()
    )
  );

-- Classes
CREATE POLICY "Admins can manage classes" ON classes
  FOR ALL USING (public.get_user_role()::text = 'admin');
CREATE POLICY "Teachers can view their assigned classes" ON classes
  FOR SELECT USING (
    public.get_user_role()::text = 'teacher'
    AND EXISTS (SELECT 1 FROM class_teachers WHERE class_id = classes.id AND teacher_id = auth.uid())
  );
CREATE POLICY "Students can view their classes" ON classes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM class_students WHERE class_id = classes.id AND student_id = auth.uid())
  );

-- Class-Teachers
CREATE POLICY "Admins can manage class_teachers" ON class_teachers
  FOR ALL USING (public.get_user_role()::text = 'admin');
CREATE POLICY "Teachers can view own assignments" ON class_teachers
  FOR SELECT USING (teacher_id = auth.uid());

-- Class-Students
CREATE POLICY "Admins can manage class_students" ON class_students
  FOR ALL USING (public.get_user_role()::text = 'admin');
CREATE POLICY "Teachers can view students in their classes" ON class_students
  FOR SELECT USING (
    public.get_user_role()::text = 'teacher'
    AND EXISTS (SELECT 1 FROM class_teachers WHERE class_id = class_students.class_id AND teacher_id = auth.uid())
  );
CREATE POLICY "Students can view their enrollments" ON class_students
  FOR SELECT USING (student_id = auth.uid());

-- Assignments
CREATE POLICY "Admins can manage assignments" ON assignments
  FOR ALL USING (public.get_user_role()::text = 'admin');
CREATE POLICY "Teachers can manage assignments in their classes" ON assignments
  FOR ALL USING (
    public.get_user_role()::text = 'teacher'
    AND EXISTS (SELECT 1 FROM class_teachers WHERE class_id = assignments.class_id AND teacher_id = auth.uid())
  );
CREATE POLICY "Teachers can view assignments in their classes" ON assignments
  FOR SELECT USING (
    public.get_user_role()::text = 'teacher'
    AND EXISTS (SELECT 1 FROM class_teachers WHERE class_id = assignments.class_id AND teacher_id = auth.uid())
  );
CREATE POLICY "Students can view their assignments" ON assignments
  FOR SELECT USING (
    public.get_user_role()::text = 'student'
    AND EXISTS (SELECT 1 FROM class_students WHERE class_id = assignments.class_id AND student_id = auth.uid())
  );

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_exam_id ON assignments(exam_id);

-- 7. Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
