
-- Create custom types
CREATE TYPE user_role AS ENUM ('student', 'admin');

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role user_role DEFAULT 'student' NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create exams table
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 60 NOT NULL,
  is_published BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create passages table
CREATE TABLE passages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE NOT NULL,
  passage_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  CONSTRAINT unique_passage_number UNIQUE (exam_id, passage_number)
);

-- Create questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passage_id UUID REFERENCES passages(id) ON DELETE CASCADE NOT NULL,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  CONSTRAINT unique_question_number UNIQUE (passage_id, question_number)
);

-- Create exam_results table
CREATE TABLE exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE NOT NULL,
  score_raw INTEGER NOT NULL,
  score_vstep NUMERIC(3, 1) NOT NULL,
  time_spent_seconds INTEGER NOT NULL,
  user_answers JSONB NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Profiles: Allow users to view their own profile, admins to view all
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Exams: Allow admins to manage all exams, students can view published exams
CREATE POLICY "Admins can manage exams" ON exams
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Students can view published exams" ON exams
  FOR SELECT USING (is_published = TRUE);

-- Passages: Allow admins to manage, students can view if exam is published
CREATE POLICY "Admins can manage passages" ON passages
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Students can view passages of published exams" ON passages
  FOR SELECT USING (EXISTS (SELECT 1 FROM exams WHERE id = exam_id AND is_published = TRUE));

-- Questions: Allow admins to manage, students can view if exam is published
CREATE POLICY "Admins can manage questions" ON questions
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Students can view questions of published exams" ON questions
  FOR SELECT USING (EXISTS (SELECT 1 FROM passages JOIN exams ON passages.exam_id = exams.id WHERE passages.id = questions.passage_id AND exams.is_published = TRUE));

-- Exam Results: Allow users to view their own, admins to view all
CREATE POLICY "Users can view their own exam results" ON exam_results
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own exam results" ON exam_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all exam results" ON exam_results
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Create trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
