import { supabase } from './supabaseClient';
import { VstepExamSet, Passage, Question, WritingTask } from '../data/vstepReadingMock';
import { sendResultNotification } from './notifications';

// ==================== Auth & Profile ====================

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data as { id: string; email: string; role: 'admin' | 'teacher' | 'student'; full_name: string; avatar_url?: string; phone?: string; bio?: string; certificates?: string; target_score?: string } | null;
}

export async function updateProfile(userId: string, updates: {
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  bio?: string;
  certificates?: string;
  target_score?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

// ==================== Exams CRUD ====================

/**
 * Hydrate raw exam rows (kèm passages + questions) thành VstepExamSet[]
 */
async function hydrateExams(examsData: any[]): Promise<VstepExamSet[]> {
  const exams: VstepExamSet[] = [];

  for (const examRow of examsData) {
    const { data: passagesData, error: passagesError } = await supabase
      .from('passages')
      .select('*')
      .eq('exam_id', examRow.id)
      .order('passage_number', { ascending: true });

    if (passagesError) throw passagesError;

    const passages: Passage[] = [];

    for (const passageRow of passagesData || []) {
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('passage_id', passageRow.id)
        .order('question_number', { ascending: true });

      if (questionsError) throw questionsError;

      const questions: Question[] = (questionsData || []).map(q => ({
        id: q.id,
        questionText: q.question_text,
        options: q.options as string[],
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
        questionType: 'detail' as const,
      }));

      passages.push({
        id: passageRow.id,
        title: passageRow.title,
        passageText: passageRow.content,
        questions,
        audioUrl: passageRow.audio_url || '',
        taskType: passageRow.task_type || undefined,
        wordLimit: passageRow.word_limit ?? undefined,
        instructions: passageRow.instructions || '',
        durationSeconds: passageRow.duration_seconds ?? undefined,
        prepSeconds: passageRow.prep_seconds ?? undefined,
      });
    }

    const isWriting = (examRow.skill_type || 'reading') === 'writing';
    const writingTasks: WritingTask[] | undefined = isWriting
      ? passages.map((p, i) => ({
          id: i + 1,
          taskNumber: i + 1,
          taskType: (p.taskType || 'essay') as WritingTask['taskType'],
          prompt: p.passageText,
          wordLimit: p.wordLimit || 0,
          instructions: p.instructions || '',
        }))
      : undefined;

    exams.push({
      id: examRow.id,
      examTitle: examRow.title,
      description: examRow.description || '',
      skillType: examRow.skill_type || 'reading',
      totalDurationMinutes: examRow.duration_minutes,
      totalQuestions: isWriting ? (writingTasks?.length || 0) : passages.reduce((sum, p) => sum + p.questions.length, 0),
      passages,
      writingTasks,
      createdAt: examRow.created_at,
      status: examRow.status || 'private',
    });
  }

  return exams;
}

/**
 * Fetch all exam sets (with passages and questions nested)
 */
export async function fetchExams(): Promise<VstepExamSet[]> {
  const { data: examsData, error: examsError } = await supabase
    .from('exams')
    .select('*')
    .order('created_at', { ascending: false });

  if (examsError) throw examsError;
  if (!examsData) return [];

  return hydrateExams(examsData);
}

/**
 * Fetch các đề thi công khai (status = 'public') — dùng cho guest/thi thử
 */
export async function fetchPublicExams(): Promise<VstepExamSet[]> {
  const { data: examsData, error: examsError } = await supabase
    .from('exams')
    .select('*')
    .eq('status', 'public')
    .order('created_at', { ascending: false });

  if (examsError) throw examsError;
  if (!examsData) return [];

  return hydrateExams(examsData);
}

/**
 * Fetch a single exam set by ID with all nested data
 */
export async function fetchExamById(examId: string): Promise<VstepExamSet | null> {
  const { data: examRow, error: examError } = await supabase
    .from('exams')
    .select('*')
    .eq('id', examId)
    .single();

  if (examError) throw examError;
  if (!examRow) return null;

  const { data: passagesData, error: passagesError } = await supabase
    .from('passages')
    .select('*')
    .eq('exam_id', examRow.id)
    .order('passage_number', { ascending: true });

  if (passagesError) throw passagesError;

  const passages: Passage[] = [];

  for (const passageRow of passagesData || []) {
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('passage_id', passageRow.id)
      .order('question_number', { ascending: true });

    if (questionsError) throw questionsError;

    const questions: Question[] = (questionsData || []).map(q => ({
      id: q.id,
      questionText: q.question_text,
      options: q.options as string[],
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      questionType: 'detail' as const,
    }));

    passages.push({
      id: passageRow.id,
      title: passageRow.title,
      passageText: passageRow.content,
      questions,
      audioUrl: passageRow.audio_url || '',
      taskType: passageRow.task_type || undefined,
      wordLimit: passageRow.word_limit ?? undefined,
      instructions: passageRow.instructions || '',
        durationSeconds: passageRow.duration_seconds ?? undefined,
        prepSeconds: passageRow.prep_seconds ?? undefined,
      });
  }

  const isWriting = (examRow.skill_type || 'reading') === 'writing';
  const writingTasks: WritingTask[] | undefined = isWriting
    ? passages.map((p, i) => ({
        id: i + 1,
        taskNumber: i + 1,
        taskType: (p.taskType || 'essay') as WritingTask['taskType'],
        prompt: p.passageText,
        wordLimit: p.wordLimit || 0,
        instructions: p.instructions || '',
      }))
    : undefined;

  return {
    id: examRow.id,
    examTitle: examRow.title,
    description: examRow.description || '',
    skillType: examRow.skill_type || 'reading',
    totalDurationMinutes: examRow.duration_minutes,
    totalQuestions: isWriting ? (writingTasks?.length || 0) : passages.reduce((sum, p) => sum + p.questions.length, 0),
    passages,
    writingTasks,
    createdAt: examRow.created_at,
    status: examRow.status || 'private',
  };
}

/**
 * Create or update an exam set (with passages and questions)
 */
export async function upsertExam(exam: VstepExamSet, userId?: string): Promise<void> {
  // 1. Upsert exam
  const examPayload: any = {
    title: exam.examTitle,
    description: exam.description,
    duration_minutes: exam.totalDurationMinutes,
    skill_type: exam.skillType,
    status: exam.status || 'private',
    is_published: (exam.status || 'private') === 'public',
  };

  if (exam.id && !exam.id.startsWith('new-')) {
    examPayload.id = exam.id;
  } else if (userId) {
    examPayload.created_by = userId;
  }

  const { data: examData, error: examError } = await supabase
    .from('exams')
    .upsert(examPayload)
    .select()
    .single();

  if (examError) throw examError;

  const examId = examData.id;

  // 2. Delete existing passages & questions for this exam (if updating)
  // First get existing passage ids
  const { data: oldPassages } = await supabase
    .from('passages')
    .select('id')
    .eq('exam_id', examId);

  if (oldPassages && oldPassages.length > 0) {
    const oldPassageIds = oldPassages.map(p => p.id);

    // Delete questions for old passages
    await supabase
      .from('questions')
      .delete()
      .in('passage_id', oldPassageIds);

    // Delete old passages
    await supabase
      .from('passages')
      .delete()
      .eq('exam_id', examId);
  }

  // 3. Insert passages and questions
  for (let pi = 0; pi < exam.passages.length; pi++) {
    const passage = exam.passages[pi];

    const { data: passageData, error: passageError } = await supabase
      .from('passages')
      .insert({
        exam_id: examId,
        passage_number: pi + 1,
        title: passage.title,
        content: passage.passageText,
        audio_url: passage.audioUrl || '',
        task_type: passage.taskType || '',
        word_limit: passage.wordLimit ?? null,
        instructions: passage.instructions || '',
        duration_seconds: passage.durationSeconds ?? null,
        prep_seconds: passage.prepSeconds ?? null,
      })
      .select()
      .single();

    if (passageError) throw passageError;

    const passageId = passageData.id;

    const questionInserts = passage.questions.map((q, qi) => ({
      passage_id: passageId,
      question_number: qi + 1,
      question_text: q.questionText,
      options: q.options,
      correct_answer: q.correctAnswer,
      explanation: q.explanation,
    }));

    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questionInserts);

    if (questionsError) throw questionsError;
  }
}

/**
 * Delete an exam set (cascades to passages and questions via DB)
 */
export async function deleteExam(examId: string): Promise<void> {
  // Get passage ids first
  const { data: passages } = await supabase
    .from('passages')
    .select('id')
    .eq('exam_id', examId);

  if (passages && passages.length > 0) {
    const passageIds = passages.map(p => p.id);

    // Delete questions for these passages
    await supabase
      .from('questions')
      .delete()
      .in('passage_id', passageIds);
  }

  // Delete passages
  await supabase
    .from('passages')
    .delete()
    .eq('exam_id', examId);

  // Delete exam
  const { error } = await supabase
    .from('exams')
    .delete()
    .eq('id', examId);

  if (error) throw error;
}

// ==================== Exam Results ====================

export interface ExamResultPayload {
  user_id: string;
  exam_id: string;
  score_raw: number;
  score_vstep: number;
  time_spent_seconds: number;
  total_questions: number;
  user_answers: Record<string, number | null>;
}

export async function submitExamResult(payload: ExamResultPayload): Promise<void> {
  const { error } = await supabase
    .from('exam_results')
    .insert(payload);

  if (error) throw error;
}

export async function fetchUserExamResults(userId: string) {
  const { data, error } = await supabase
    .from('exam_results')
    .select(`
      *,
      exams:exam_id ( title, skill_type )
    `)
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Lịch sử bài viết của học viên (kèm điểm nếu đã chấm)
export async function fetchUserWritingSubmissions(userId: string) {
  const { data, error } = await supabase
    .from('writing_submissions')
    .select(`
      *,
      exams:exam_id ( title, skill_type ),
      writing_grades ( score, feedback, graded_at, is_ai )
    `)
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((s: any) => ({
    ...s,
    grade: s.writing_grades?.[0] || null,
    exam_title: s.exams?.title,
    skill_type: s.exams?.skill_type,
  }));
}

// Lịch sử bài nói của học viên (kèm điểm nếu đã chấm)
export async function fetchUserSpeakingSubmissions(userId: string) {
  const { data, error } = await supabase
    .from('speaking_submissions')
    .select(`
      *,
      exams:exam_id ( title, skill_type ),
      speaking_grades ( score, feedback, graded_at, is_ai )
    `)
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((s: any) => ({
    ...s,
    grade: s.speaking_grades?.[0] || null,
    exam_title: s.exams?.title,
    skill_type: s.exams?.skill_type,
  }));
}

// ==================== Admin - Student Management ====================

export interface StudentWithStats {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  total_exams: number;
  avg_score: number;
  best_score: number;
  last_exam_date: string | null;
}

export async function fetchAllStudentsWithStats(teacherId?: string): Promise<StudentWithStats[]> {
  // If teacherId is provided, only fetch students assigned to teacher's classes
  let studentIdsToFetch: string[] | undefined;

  if (teacherId) {
    const { data: ctData } = await supabase
      .from('class_teachers')
      .select('class_id')
      .eq('teacher_id', teacherId);

    if (ctData && ctData.length > 0) {
      const classIds = ctData.map(c => c.class_id);
      const { data: csData } = await supabase
        .from('class_students')
        .select('student_id')
        .in('class_id', classIds);

      if (csData) {
        studentIdsToFetch = [...new Set(csData.map(c => c.student_id))];
      }
    }

    // If teacher has no classes or no students, return empty
    if (!studentIdsToFetch || studentIdsToFetch.length === 0) {
      return [];
    }
  }

  let query = supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student');

  if (studentIdsToFetch) {
    query = query.in('id', studentIdsToFetch);
  }

  const { data: students, error: studentsError } = await query;

  if (studentsError) throw studentsError;
  if (!students || students.length === 0) return [];

  const studentIds = students.map(s => s.id);
  const { data: results, error: resultsError } = await supabase
    .from('exam_results')
    .select('*')
    .in('user_id', studentIds);

  if (resultsError) throw resultsError;

  const resultsMap = new Map<string, any[]>();
  for (const r of results || []) {
    if (!resultsMap.has(r.user_id)) resultsMap.set(r.user_id, []);
    resultsMap.get(r.user_id)!.push(r);
  }

  return students.map(s => {
    const studentResults = resultsMap.get(s.id) || [];
    const scores = studentResults.map(r => r.score_vstep);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const dates = studentResults.map(r => r.submitted_at).sort().reverse();

    return {
      id: s.id,
      email: s.email || '',
      full_name: s.full_name || '',
      created_at: s.created_at || '',
      total_exams: studentResults.length,
      avg_score: Math.round(avgScore * 10) / 10,
      best_score: bestScore,
      last_exam_date: dates[0] || null,
    };
  });
}

export async function fetchStudentDetailResults(studentId: string) {
  const { data, error } = await supabase
    .from('exam_results')
    .select(`
      *,
      exams:exam_id ( title )
    `)
    .eq('user_id', studentId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return data;
}

// ==================== Teacher Stats ====================

export interface TeacherStats {
  exams_created: number;
  total_students: number;
  classes_count: number;
}

export async function fetchTeacherStats(teacherId: string): Promise<TeacherStats> {
  // Count classes teacher is assigned to
  const { data: ctData } = await supabase
    .from('class_teachers')
    .select('class_id')
    .eq('teacher_id', teacherId);

  const classIds = ctData?.map(c => c.class_id) || [];
  const classesCount = classIds.length;

  // Count distinct students across those classes
  let totalStudents = 0;
  if (classIds.length > 0) {
    const { data: studentData } = await supabase
      .from('class_students')
      .select('student_id')
      .in('class_id', classIds);

    if (studentData) {
      // Deduplicate by student_id to avoid counting same student in multiple classes
      totalStudents = new Set(studentData.map(s => s.student_id)).size;
    }
  }

  // Count exams created by this teacher
  const { count: examsCount } = await supabase
    .from('exams')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', teacherId);

  return {
    exams_created: examsCount || 0,
    total_students: totalStudents,
    classes_count: classesCount,
  };
}

// ==================== Class Management ====================

export interface ClassData {
  id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  teacher_count?: number;
  student_count?: number;
}

export interface TeacherProfile {
  id: string;
  email: string;
  full_name: string;
}

export interface StudentProfile {
  id: string;
  email: string;
  full_name: string;
}

/**
 * Fetch all classes (with teacher/student counts)
 */
export async function fetchClasses(): Promise<ClassData[]> {
  const { data: classes, error } = await supabase
    .from('classes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!classes) return [];

  const result: ClassData[] = [];
  for (const c of classes) {
    const { count: teacherCount } = await supabase
      .from('class_teachers')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', c.id);

    const { count: studentCount } = await supabase
      .from('class_students')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', c.id);

    result.push({
      ...c,
      teacher_count: teacherCount || 0,
      student_count: studentCount || 0,
    });
  }

  return result;
}

/**
 * Fetch classes assigned to a specific teacher
 */
export async function fetchTeacherClasses(teacherId: string): Promise<ClassData[]> {
  const { data: ctData, error: ctError } = await supabase
    .from('class_teachers')
    .select('class_id')
    .eq('teacher_id', teacherId);

  if (ctError) throw ctError;
  if (!ctData || ctData.length === 0) return [];

  const classIds = ctData.map(c => c.class_id);

  const { data: classes, error } = await supabase
    .from('classes')
    .select('*')
    .in('id', classIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!classes) return [];

  const result: ClassData[] = [];
  for (const c of classes) {
    const { count: teacherCount } = await supabase
      .from('class_teachers')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', c.id);

    const { count: studentCount } = await supabase
      .from('class_students')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', c.id);

    result.push({
      ...c,
      teacher_count: teacherCount || 0,
      student_count: studentCount || 0,
    });
  }

  return result;
}

/**
 * Create a new class
 */
export async function createClass(name: string, description: string, createdBy: string): Promise<ClassData> {
  const { data, error } = await supabase
    .from('classes')
    .insert({ name, description, created_by: createdBy })
    .select()
    .single();

  if (error) throw error;
  return { ...data, teacher_count: 0, student_count: 0 };
}

/**
 * Update a class
 */
export async function updateClass(id: string, name: string, description: string): Promise<void> {
  const { error } = await supabase
    .from('classes')
    .update({ name, description })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Delete a class (cascades to class_teachers and class_students)
 */
export async function deleteClass(id: string): Promise<void> {
  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ==================== Teacher Assignment ====================

/**
 * Fetch all teachers
 */
export async function fetchTeachers(): Promise<TeacherProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'teacher');

  if (error) throw error;
  return data || [];
}

/**
 * Fetch teachers assigned to a class
 */
export async function fetchClassTeachers(classId: string): Promise<TeacherProfile[]> {
  const { data, error } = await supabase
    .from('class_teachers')
    .select('teacher_id')
    .eq('class_id', classId);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const teacherIds = data.map(d => d.teacher_id);
  const { data: teachers, error: tError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', teacherIds);

  if (tError) throw tError;
  return teachers || [];
}

/**
 * Assign a teacher to a class
 */
export async function assignTeacherToClass(classId: string, teacherId: string): Promise<void> {
  const { error } = await supabase
    .from('class_teachers')
    .insert({ class_id: classId, teacher_id: teacherId });

  if (error) throw error;
}

/**
 * Remove a teacher from a class
 */
export async function removeTeacherFromClass(classId: string, teacherId: string): Promise<void> {
  const { error } = await supabase
    .from('class_teachers')
    .delete()
    .eq('class_id', classId)
    .eq('teacher_id', teacherId);

  if (error) throw error;
}

// ==================== Student Assignment ====================

/**
 * Fetch all students
 */
export async function fetchAllStudents(): Promise<StudentProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'student');

  if (error) throw error;
  return data || [];
}

/**
 * Fetch students assigned to a class
 */
export async function fetchClassStudents(classId: string): Promise<StudentProfile[]> {
  const { data, error } = await supabase
    .from('class_students')
    .select('student_id')
    .eq('class_id', classId);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const studentIds = data.map(d => d.student_id);
  const { data: students, error: sError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', studentIds);

  if (sError) throw sError;
  return students || [];
}

/**
 * Assign a student to a class
 */
export async function assignStudentToClass(classId: string, studentId: string): Promise<void> {
  const { error } = await supabase
    .from('class_students')
    .insert({ class_id: classId, student_id: studentId });

  if (error) throw error;
}

/**
 * Remove a student from a class
 */
export async function removeStudentFromClass(classId: string, studentId: string): Promise<void> {
  const { error } = await supabase
    .from('class_students')
    .delete()
    .eq('class_id', classId)
    .eq('student_id', studentId);

  if (error) throw error;
}

/**
 * Fetch student IDs by teacher (students in all of teacher's classes)
 */
async function fetchTeacherStudentIds(teacherId: string): Promise<string[]> {
  const { data: ctData, error: ctError } = await supabase
    .from('class_teachers')
    .select('class_id')
    .eq('teacher_id', teacherId);

  if (ctError) throw ctError;
  if (!ctData || ctData.length === 0) return [];

  const classIds = ctData.map(c => c.class_id);

  const { data: csData, error: csError } = await supabase
    .from('class_students')
    .select('student_id')
    .in('class_id', classIds);

  if (csError) throw csError;
  if (!csData) return [];

  return [...new Set(csData.map(c => c.student_id))];
}

// ==================== Assignments ====================

export interface Assignment {
  id: string;
  class_id: string;
  exam_id: string;
  title: string;
  description: string;
  deadline: string;
  created_by: string;
  created_at: string;
  exam_title?: string;
}

export interface CreateAssignmentPayload {
  class_id: string;
  exam_id: string;
  title: string;
  description?: string;
  deadline: string;
  created_by: string;
}

/**
 * Fetch assignments for a class (with exam title)
 */
export async function fetchClassAssignments(classId: string): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select(`
      *,
      exams:exam_id ( title )
    `)
    .eq('class_id', classId)
    .order('deadline', { ascending: true });

  if (error) throw error;
  if (!data) return [];

  return data.map((a: any) => ({
    id: a.id,
    class_id: a.class_id,
    exam_id: a.exam_id,
    title: a.title,
    description: a.description || '',
    deadline: a.deadline,
    created_by: a.created_by,
    created_at: a.created_at,
    exam_title: a.exams?.title || 'Unknown Exam',
  }));
}

/**
 * Fetch assignments for a student (across all their classes)
 */
export async function fetchStudentAssignments(studentId: string): Promise<(Assignment & { class_name?: string })[]> {
  // Get student's classes
  const { data: csData, error: csError } = await supabase
    .from('class_students')
    .select('class_id')
    .eq('student_id', studentId);

  if (csError) throw csError;
  if (!csData || csData.length === 0) return [];

  const classIds = csData.map(c => c.class_id);

  // Get class names
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name')
    .in('id', classIds);

  const classMap = new Map(classes?.map(c => [c.id, c.name]) || []);

  // Get assignments for those classes
  const { data, error } = await supabase
    .from('assignments')
    .select(`
      *,
      exams:exam_id ( title )
    `)
    .in('class_id', classIds)
    .order('deadline', { ascending: true });

  if (error) throw error;
  if (!data) return [];

  return data.map((a: any) => ({
    id: a.id,
    class_id: a.class_id,
    exam_id: a.exam_id,
    title: a.title,
    description: a.description || '',
    deadline: a.deadline,
    created_by: a.created_by,
    created_at: a.created_at,
    exam_title: a.exams?.title || 'Unknown Exam',
    class_name: classMap.get(a.class_id) || 'Unknown Class',
  }));
}

/**
 * Create an assignment
 */
export async function createAssignment(payload: CreateAssignmentPayload): Promise<void> {
  const { error } = await supabase
    .from('assignments')
    .insert({
      class_id: payload.class_id,
      exam_id: payload.exam_id,
      title: payload.title,
      description: payload.description || '',
      deadline: payload.deadline,
      created_by: payload.created_by,
    });

  if (error) throw error;
}

/**
 * Delete an assignment
 */
export async function deleteAssignment(id: string): Promise<void> {
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ==================== Analytics ====================

export interface LeaderboardEntry {
  student_id: string;
  full_name: string;
  email: string;
  score_vstep: number;
  score_raw: number;
  submitted_at: string | null;
  time_spent_seconds: number;
}

export interface ScoreDistribution {
  range: string;
  count: number;
  min: number;
  max: number;
}

/**
 * Fetch leaderboard for an assignment (students in class sorted by score)
 */
export async function fetchAssignmentLeaderboard(assignmentId: string): Promise<LeaderboardEntry[]> {
  // Get assignment info
  const { data: assignment, error: aError } = await supabase
    .from('assignments')
    .select('class_id, exam_id')
    .eq('id', assignmentId)
    .single();

  if (aError) throw aError;
  if (!assignment) return [];

  // Get students in this class
  const { data: csData } = await supabase
    .from('class_students')
    .select('student_id')
    .eq('class_id', assignment.class_id);

  if (!csData || csData.length === 0) return [];

  const studentIds = csData.map(c => c.student_id);

  // Get student profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', studentIds);

  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

  // Get exam results for this exam by these students
  const { data: results } = await supabase
    .from('exam_results')
    .select('*')
    .eq('exam_id', assignment.exam_id)
    .in('user_id', studentIds);

  const resultMap = new Map(results?.map(r => [r.user_id, r]) || []);

  return studentIds.map(sid => {
    const profile = profileMap.get(sid);
    const result = resultMap.get(sid);
    return {
      student_id: sid,
      full_name: profile?.full_name || 'Unknown',
      email: profile?.email || '',
      score_vstep: result?.score_vstep ?? 0,
      score_raw: result?.score_raw ?? 0,
      submitted_at: result?.submitted_at ?? null,
      time_spent_seconds: result?.time_spent_seconds ?? 0,
    };
  }).sort((a, b) => b.score_vstep - a.score_vstep);
}

/**
 * Get students who haven't submitted for an assignment
 */
export async function fetchPendingStudents(assignmentId: string): Promise<{ id: string; full_name: string; email: string }[]> {
  const { data: assignment, error: aError } = await supabase
    .from('assignments')
    .select('class_id, exam_id')
    .eq('id', assignmentId)
    .single();

  if (aError) throw aError;
  if (!assignment) return [];

  // Get students in class
  const { data: csData } = await supabase
    .from('class_students')
    .select('student_id')
    .eq('class_id', assignment.class_id);

  if (!csData || csData.length === 0) return [];

  const studentIds = csData.map(c => c.student_id);

  // Get who has submitted
  const { data: results } = await supabase
    .from('exam_results')
    .select('user_id')
    .eq('exam_id', assignment.exam_id)
    .in('user_id', studentIds);

  const submittedIds = new Set(results?.map(r => r.user_id) || []);
  const pendingIds = studentIds.filter(id => !submittedIds.has(id));

  if (pendingIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', pendingIds);

  return (profiles || []).map(p => ({
    id: p.id,
    full_name: p.full_name || 'Unknown',
    email: p.email || '',
  }));
}

/**
 * Calculate score distribution for a class
 */
export async function fetchClassScoreDistribution(
  classId: string,
  examId?: string
): Promise<ScoreDistribution[]> {
  // Get students in class
  const { data: csData } = await supabase
    .from('class_students')
    .select('student_id')
    .eq('class_id', classId);

  if (!csData || csData.length === 0) return [];

  const studentIds = csData.map(c => c.student_id);

  // Get results
  let query = supabase
    .from('exam_results')
    .select('score_vstep, user_id')
    .in('user_id', studentIds);

  if (examId) {
    query = query.eq('exam_id', examId);
  }

  const { data: results } = await query;

  if (!results || results.length === 0) return [];

  const ranges = [
    { min: 0, max: 1, label: '0-1.0' },
    { min: 1, max: 2, label: '1.0-2.0' },
    { min: 2, max: 3, label: '2.0-3.0' },
    { min: 3, max: 4, label: '3.0-4.0' },
    { min: 4, max: 5, label: '4.0-5.0' },
    { min: 5, max: 6, label: '5.0-6.0' },
    { min: 6, max: 7, label: '6.0-7.0' },
    { min: 7, max: 8, label: '7.0-8.0' },
    { min: 8, max: 9, label: '8.0-9.0' },
    { min: 9, max: 10.1, label: '9.0-10.0' },
  ];

  return ranges.map(r => ({
    range: r.label,
    count: results.filter(res => res.score_vstep >= r.min && res.score_vstep < r.max).length,
    min: r.min,
    max: r.max,
  }));
}

/**
 * Get student's class IDs
 */
export async function fetchStudentClassIds(studentId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('class_students')
    .select('class_id')
    .eq('student_id', studentId);

  if (error) throw error;
  return (data || []).map(d => d.class_id);
}

// ==================== Audio Storage ====================

const AUDIO_BUCKET = 'exam-audio';

/**
 * Upload an audio file to Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
export async function uploadAudio(file: File, examId: string, passageNumber: number): Promise<string> {
  const ext = file.name.split('.').pop() || 'mp3';
  const filePath = `${examId}/passage-${passageNumber}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) throw uploadError;

  return getAudioUrl(filePath);
}

/**
 * Get the public URL for an audio file stored in Supabase Storage.
 * If the input is already a full URL (starts with http), returns it as-is.
 */
export function getAudioUrl(audioPath: string): string {
  if (audioPath.startsWith('http://') || audioPath.startsWith('https://')) {
    return audioPath;
  }

  const { data } = supabase.storage
    .from(AUDIO_BUCKET)
    .getPublicUrl(audioPath);

  return data.publicUrl;
}

/**
 * Delete an audio file from Supabase Storage.
 */
export async function deleteAudio(audioPath: string): Promise<void> {
  // If it's a full URL, extract the path relative to the bucket
  let pathToDelete = audioPath;
  if (audioPath.startsWith('http://') || audioPath.startsWith('https://')) {
    // Try to extract storage path from public URL
    const url = new URL(audioPath);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.findIndex(p => p === AUDIO_BUCKET);
    if (bucketIndex >= 0) {
      pathToDelete = pathParts.slice(bucketIndex + 1).join('/');
    } else {
      // Not a Supabase storage URL, skip deletion
      return;
    }
  }

  const { error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .remove([pathToDelete]);

  if (error) throw error;
}

// ==================== Speaking Submissions & Grading ====================

/**
 * Upload a speaking audio recording to Supabase Storage.
 */
export async function uploadSpeakingAudio(
  file: Blob,
  userId: string,
  examId: string,
  passageId: number
): Promise<string> {
  // Detect extension from blob type
  const ext = file.type.includes('mp4') ? 'm4a' : file.type.includes('aac') ? 'aac' : 'webm';
  const contentType = file.type || 'audio/webm';
  const fileName = `speaking/${userId}/${examId}/${passageId}_${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('exam-audio')
    .upload(fileName, file, {
      contentType,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('exam-audio')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

/**
 * Upload audio speaking của GUEST (không tài khoản) lên storage.
 * App giữ các URL này và gắn vào exam_leads (cột speaking_audio) khi
 * guest để lại thông tin liên hệ ở màn hình nhận kết quả.
 */
export async function uploadGuestSpeakingAudio(
  file: Blob,
  examId: string,
  passageNumber: number
): Promise<string> {
  const ext = file.type.includes('mp4') ? 'm4a' : file.type.includes('aac') ? 'aac' : 'webm';
  const contentType = file.type || 'audio/webm';
  const fileName = `guest/${examId}/${passageNumber}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('exam-audio')
    .upload(fileName, file, { contentType, upsert: false });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('exam-audio')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

// ==================== Storage Management (Admin Database tab) ====================

export interface StorageItem {
  name: string;
  id: string | null;
  isFolder: boolean;
  size?: number;
  mimetype?: string;
  updatedAt?: string;
}

/**
 * Liệt kê folders/files trong bucket exam-audio (path rỗng = gốc).
 * Chỉ admin được dùng (RLS storage). Trả về URL công khai cho file.
 */
export async function fetchStorageListing(path: string): Promise<StorageItem[]> {
  const { data, error } = await supabase.storage
    .from('exam-audio')
    .list(path, {
      limit: 200,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

  if (error) throw error;

  return (data || []).map(item => ({
    name: item.name,
    id: item.id,
    isFolder: item.metadata === null,
    size: item.metadata?.size,
    mimetype: item.metadata?.mimetype,
    updatedAt: item.metadata?.lastModified
      ? new Date(item.metadata.lastModified).toLocaleString('vi-VN')
      : undefined,
  }));
}

/** Xóa 1 file khỏi bucket exam-audio (admin). */
export async function deleteStorageObject(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('exam-audio')
    .remove([filePath]);

  if (error) throw error;
}

export async function submitSpeakingSubmission(
  userId: string,
  examId: string,
  passageNumber: number,
  passageTitle: string,
  audioUrl: string,
  durationSeconds: number
): Promise<any> {
  const { data, error } = await supabase
    .from('speaking_submissions')
    .insert({
      user_id: userId,
      exam_id: examId,
      passage_id: passageNumber,
      passage_title: passageTitle,
      audio_url: audioUrl,
      duration_seconds: durationSeconds,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchSpeakingSubmissions(params?: {
  teacherId?: string;
  examId?: string;
  status?: string;
}): Promise<any[]> {
  let query = supabase
    .from('speaking_submissions')
    .select(`
      *,
      profiles:user_id ( full_name, email ),
      exams:exam_id ( title )
    `)
    .order('submitted_at', { ascending: false });

  if (params?.examId) {
    query = query.eq('exam_id', params.examId);
  }

  const { data, error } = await query;

  if (error) throw error;
  if (!data) return [];

  // Transform to include user_name and exam_title
  const submissions = data.map((s: any) => ({
    ...s,
    user_name: s.profiles?.full_name || s.profiles?.email || 'Unknown',
    exam_title: s.exams?.title || 'Unknown Exam',
  }));

  // If teacherId provided, filter by teacher's students
  if (params?.teacherId) {
    const studentIds = await fetchTeacherStudentIds(params.teacherId);
    if (studentIds.length === 0) return [];
    return submissions.filter((s: any) => studentIds.includes(s.user_id));
  }

  // If status filter provided
  if (params?.status) {
    if (params.status === 'pending') {
      const { data: gradedIds } = await supabase
        .from('speaking_grades')
        .select('submission_id');

      const gradedSet = new Set(gradedIds?.map((g: any) => g.submission_id) || []);
      return submissions.filter((s: any) => !gradedSet.has(s.id));
    } else if (params.status === 'graded') {
      const { data: gradedIds } = await supabase
        .from('speaking_grades')
        .select('submission_id');

      const gradedSet = new Set(gradedIds?.map((g: any) => g.submission_id) || []);
      return submissions.filter((s: any) => gradedSet.has(s.id));
    }
  }

  return submissions;
}

export async function submitSpeakingGrade(
  submissionId: string,
  graderId: string,
  score: number,
  feedback: string,
  criteriaScores?: any
): Promise<void> {
  const { data: existing } = await supabase
    .from('speaking_grades')
    .select('id')
    .eq('submission_id', submissionId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('speaking_grades')
      .update({
        grader_id: graderId,
        score,
        feedback,
        criteria_scores: criteriaScores,
        is_ai: false,
      })
      .eq('id', existing.id);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('speaking_grades')
      .insert({
        submission_id: submissionId,
        grader_id: graderId,
        score,
        feedback,
        criteria_scores: criteriaScores,
        is_ai: false,
      });

    if (error) throw error;
  }
}

// ==================== Writing Submissions & Grading ====================

export async function submitWritingSubmission(
  userId: string,
  examId: string,
  taskId: number,
  content: string,
  taskType: string
): Promise<any> {
  const { data, error } = await supabase
    .from('writing_submissions')
    .insert({
      user_id: userId,
      exam_id: examId,
      task_id: taskId,
      content,
      task_type: taskType,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchWritingSubmissions(params?: {
  teacherId?: string;
  examId?: string;
  status?: string;
}): Promise<any[]> {
  let query = supabase
    .from('writing_submissions')
    .select(`
      *,
      profiles:user_id ( full_name, email ),
      exams:exam_id ( title )
    `)
    .order('submitted_at', { ascending: false });

  if (params?.examId) {
    query = query.eq('exam_id', params.examId);
  }

  const { data, error } = await query;

  if (error) throw error;
  if (!data) return [];

  // Transform to include user_name and exam_title
  const submissions = data.map((s: any) => ({
    ...s,
    user_name: s.profiles?.full_name || s.profiles?.email || 'Unknown',
    exam_title: s.exams?.title || 'Unknown Exam',
  }));

  // If teacherId provided, filter by teacher's students
  if (params?.teacherId) {
    const studentIds = await fetchTeacherStudentIds(params.teacherId);
    if (studentIds.length === 0) return [];
    return submissions.filter((s: any) => studentIds.includes(s.user_id));
  }

  // If status filter provided
  if (params?.status) {
    if (params.status === 'pending') {
      // Submissions without a grade
      const { data: gradedIds } = await supabase
        .from('writing_grades')
        .select('submission_id');

      const gradedSet = new Set(gradedIds?.map((g: any) => g.submission_id) || []);
      return submissions.filter((s: any) => !gradedSet.has(s.id));
    } else if (params.status === 'graded') {
      const { data: gradedIds } = await supabase
        .from('writing_grades')
        .select('submission_id');

      const gradedSet = new Set(gradedIds?.map((g: any) => g.submission_id) || []);
      return submissions.filter((s: any) => gradedSet.has(s.id));
    }
  }

  return submissions;
}

export async function submitWritingGrade(
  submissionId: string,
  graderId: string,
  score: number,
  feedback: string,
  criteriaScores?: any
): Promise<void> {
  // Check if grade already exists
  const { data: existing } = await supabase
    .from('writing_grades')
    .select('id')
    .eq('submission_id', submissionId)
    .maybeSingle();

  if (existing) {
    // Update existing grade
    const { error } = await supabase
      .from('writing_grades')
      .update({
        grader_id: graderId,
        score,
        feedback,
        criteria_scores: criteriaScores,
        is_ai: false,
      })
      .eq('id', existing.id);

    if (error) throw error;
  } else {
    // Insert new grade
    const { error } = await supabase
      .from('writing_grades')
      .insert({
        submission_id: submissionId,
        grader_id: graderId,
        score,
        feedback,
        criteria_scores: criteriaScores,
        is_ai: false,
      });

    if (error) throw error;
  }
}

/**
 * Simulate AI grading for writing tasks.
 * Placeholder function - replace with real OpenAI API call later.
 */
export async function aiGradeWriting(
  _taskPrompt: string,
  studentResponse: string,
  _taskType: string
): Promise<{ score: number; feedback: string; criteriaScores: any }> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    // TODO: Replace with actual OpenAI API integration
    // Example:
    // const response = await openai.chat.completions.create({
    //   model: 'gpt-4',
    //   messages: [
    //     { role: 'system', content: 'You are an IELTS/English writing examiner...' },
    //     { role: 'user', content: `Task: ${taskPrompt}\n\nStudent Response: ${studentResponse}` }
    //   ]
    // });
    // return JSON.parse(response.choices[0].message.content);

    // Simulated grading logic based on response length and content
    const wordCount = studentResponse.trim() ? studentResponse.trim().split(/\s+/).length : 0;

    // Simple heuristic scoring
    let score = 0;
    let grammarScore = 0;
    let vocabularyScore = 0;
    let coherenceScore = 0;
    let taskAchievementScore = 0;

    // Task achievement: check if response is substantial
    if (wordCount > 0) taskAchievementScore = Math.min(10, Math.round((wordCount / 100) * 10));
    else taskAchievementScore = 0;

    // Coherence: check for paragraph breaks and connecting words
    const hasParagraphs = studentResponse.includes('\n\n');
    const hasConnectors = /\b(however|therefore|moreover|furthermore|in addition|on the other hand|firstly|secondly|finally|in conclusion)\b/i.test(studentResponse);
    coherenceScore = hasParagraphs ? 6 : 4;
    if (hasConnectors) coherenceScore += 2;

    // Vocabulary: check for advanced words
    const advancedWords = /\b(significant|substantial|consequently|nevertheless|alternatively|particularly|demonstrate|illustrate|constitutes|ultimately)\b/i;
    vocabularyScore = advancedWords.test(studentResponse) ? 6 : 4;
    if (wordCount > 150) vocabularyScore += 1;

    // Grammar: simple check for sentence variety
    const sentenceCount = studentResponse.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    grammarScore = sentenceCount >= 3 ? 6 : 4;
    if (wordCount > 100) grammarScore += 1;

    // Overall score (average of criteria)
    const criteriaScores = {
      grammar: Math.min(10, grammarScore),
      vocabulary: Math.min(10, vocabularyScore),
      coherence: Math.min(10, coherenceScore),
      task_achievement: Math.min(10, taskAchievementScore),
    };

    score = Math.round(
      (criteriaScores.grammar +
        criteriaScores.vocabulary +
        criteriaScores.coherence +
        criteriaScores.task_achievement) /
        4
    );

    // Clamp score to 0-10
    score = Math.max(0, Math.min(10, score));

    // Generate feedback
    let feedback = '';
    if (wordCount === 0) {
      feedback = 'No response provided. Cannot evaluate.';
    } else {
      feedback = `AI Grading Analysis:\n\n`;
      feedback += `• Task Achievement (${criteriaScores.task_achievement}/10): ${criteriaScores.task_achievement >= 7 ? 'Good coverage of task requirements.' : criteriaScores.task_achievement >= 5 ? 'Adequate but could be more detailed.' : 'Response is too brief.'}\n`;
      feedback += `• Coherence & Cohesion (${criteriaScores.coherence}/10): ${hasConnectors ? 'Good use of linking words and structured paragraphs.' : 'Consider using more connecting words and paragraph organization.'}\n`;
      feedback += `• Vocabulary (${criteriaScores.vocabulary}/10): ${advancedWords.test(studentResponse) ? 'Good range of vocabulary with some advanced words.' : 'Vocabulary is adequate; try using more varied and sophisticated words.'}\n`;
      feedback += `• Grammar (${criteriaScores.grammar}/10): ${sentenceCount >= 3 ? 'Good sentence variety.' : 'Try to vary your sentence structures.'}\n\n`;
      feedback += `Total words: ${wordCount}. ${wordCount >= 50 ? 'Length is adequate.' : 'Response is quite short. Try to expand your ideas.'}`;
    }

    return { score, feedback, criteriaScores };
  } catch (err) {
    console.error('AI Grading failed:', err);
    // Fallback: return basic score
    return {
      score: 0,
      feedback: 'AI Grading is currently unavailable. Please grade manually.',
      criteriaScores: { grammar: 0, vocabulary: 0, coherence: 0, task_achievement: 0 },
    };
  }
}

// ============================================================
// Guest Leads — dữ liệu thi thử miễn phí để tìm potential lead
// ============================================================

interface GuestLeadResult {
  exam_id?: string;
  exam_title?: string;
  skill_type?: string;
  full_name: string;
  phone: string;
  email?: string;
  passcode?: string;
  score_raw?: number | null;
  score_vstep?: number | null;
  total_questions?: number | null;
  time_spent_seconds?: number | null;
  user_answers?: Record<string, number | null> | null;
  writing_answers?: Record<string, string> | null;
  /** Audio speaking của guest: [{ passage_number, passage_title, audio_url, duration_seconds }] */
  speaking_audio?: any[] | null;
  /** Thuộc session thi thử theo bộ (nếu có) — gom nhiều lead vào 1 passcode */
  session_id?: string;
}

/**
 * Guest để lại thông tin liên hệ để nhận kết quả (chèn vào bảng exam_leads).
 * RLS cho phép anon INSERT — không cần tài khoản.
 */
export async function submitGuestResult(payload: GuestLeadResult): Promise<void> {
  const { error } = await supabase.from('exam_leads').insert(payload);
  if (error) throw error;

  // Điểm cắm thông báo kết quả qua Zalo OA (hiện là no-op, xem src/lib/notifications.ts)
  void sendResultNotification({
    fullName: payload.full_name,
    phone: payload.phone,
    passcode: payload.passcode,
    examTitle: payload.exam_title,
    scoreVstep: payload.score_vstep,
  });
}

/**
 * Admin xem danh sách leads (người thi thử đã để lại thông tin).
 * Kèm tên giáo viên được gán chấm + người chấm.
 */
export async function fetchExamLeads(): Promise<any[]> {
  const { data, error } = await supabase
    .from('exam_leads')
    .select(`
      *,
      assigned_teacher:assigned_teacher_id ( id, email, full_name ),
      grader:graded_by ( id, email, full_name )
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data || []).map((l: any) => ({
    ...l,
    assigned_teacher_name: l.assigned_teacher?.full_name || l.assigned_teacher?.email || null,
    grader_name: l.grader?.full_name || l.grader?.email || null,
  }));
}

/**
 * Sinh passcode ngẫu nhiên 8 ký tự (không gồm ký tự dễ nhầm lẫn 0/O, 1/I).
 * Hiển thị dạng "A7K3-9PL2".
 */
export function generatePasscode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand = new Uint32Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(rand);
  } else {
    for (let i = 0; i < 8; i++) rand[i] = Math.floor(Math.random() * 0xffffffff);
  }
  const code = Array.from(rand, (n) => chars[n % chars.length]).join('');
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Tra cứu kết quả thi thử của guest bằng sdt + passcode.
 * Gọi hàm SECURITY DEFINER trên DB (get_guest_result) để anon được phép.
 */
export async function fetchGuestResult(phone: string, passcode: string): Promise<any | null> {
  const { data, error } = await supabase.rpc('get_guest_result', {
    p_phone: phone,
    p_passcode: passcode,
  });
  if (error) throw error;
  return (Array.isArray(data) && data.length > 0) ? data[0] : null;
}

// ============================================================
// Exam Bundles & Guest Sessions — thi thử theo bộ (4 kỹ năng / 1 passcode)
// ============================================================

export interface ExamBundle {
  id: string;
  title: string;
  description: string;
  exam_ids: string[];
  /** 'public' = mọi người | 'private' = chỉ student | 'hidden' = ẩn hoàn toàn (chỉ admin) */
  visibility: 'public' | 'private' | 'hidden';
  /** Chế độ thi nghiêm ngặt (anti-cheat): bắt buộc fullscreen, chặn tab mới / đổi tab; sau 3 vi phạm tự nộp */
  strict_mode?: boolean;
  created_by?: string | null;
  created_at: string;
}

export interface GuestSession {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  passcode: string;
  bundle_id?: string | null;
  created_at: string;
}

/** Guest: chỉ bộ public. Student: public + private. */
export async function fetchExamBundles(opts?: { guestOnly?: boolean }): Promise<ExamBundle[]> {
  let query = supabase.from('exam_bundles').select('*');
  query = opts?.guestOnly
    ? query.eq('visibility', 'public')
    : query.in('visibility', ['public', 'private']);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(b => ({ ...b, exam_ids: b.exam_ids || [] }));
}

/** Admin: toàn bộ bộ đề (kể cả hidden) */
export async function fetchAllExamBundles(): Promise<ExamBundle[]> {
  const { data, error } = await supabase
    .from('exam_bundles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(b => ({ ...b, exam_ids: b.exam_ids || [] }));
}

export async function createExamBundle(payload: {
  title: string;
  description: string;
  exam_ids: string[];
  visibility: 'public' | 'private' | 'hidden';
  strict_mode?: boolean;
  created_by?: string;
}): Promise<void> {
  const { error } = await supabase.from('exam_bundles').insert(payload);
  if (error) throw error;
}

export async function updateExamBundle(id: string, payload: {
  title?: string;
  description?: string;
  exam_ids?: string[];
  visibility?: 'public' | 'private' | 'hidden';
  strict_mode?: boolean;
}): Promise<void> {
  const { error } = await supabase.from('exam_bundles').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteExamBundle(id: string): Promise<void> {
  const { error } = await supabase.from('exam_bundles').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Tạo session mới cho guest sau khi nộp xong bộ (1 passcode cho toàn bộ kỹ năng).
 * Passcode UNIQUE — nếu trùng sẽ tự sinh lại (tối đa 3 lần).
 */
export async function createGuestSession(payload: {
  full_name: string;
  phone: string;
  email?: string;
  passcode: string;
  bundle_id?: string;
}): Promise<GuestSession> {
  // Dùng RPC SECURITY DEFINER thay vì insert().select():
  // guest (anon) không có SELECT policy trên guest_sessions nên không đọc
  // được dòng vừa chèn qua RETURNING → RPC trả dòng trực tiếp.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase.rpc('create_guest_session', {
      p_full_name: payload.full_name,
      p_phone: payload.phone,
      p_email: payload.email || '',
      p_passcode: payload.passcode,
      p_bundle_id: payload.bundle_id || null,
    });
    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (!error && row) {
      return {
        id: row.id,
        full_name: row.full_name,
        phone: row.phone,
        email: row.email || '',
        passcode: row.passcode,
        bundle_id: row.bundle_id || null,
        created_at: row.created_at,
      };
    }
    // 23505 = unique_violation (passcode trùng) → sinh lại
    if ((error as any)?.code !== '23505') throw error;
    payload = { ...payload, passcode: generatePasscode() };
  }
  throw new Error('Không thể tạo passcode duy nhất, vui lòng thử lại.');
}

/** Tra cứu kết quả cả bộ: trả về session + toàn bộ leads theo sdt + passcode */
export async function fetchGuestSessionResult(
  phone: string,
  passcode: string
): Promise<{ session: GuestSession; leads: any[] } | null> {
  const { data, error } = await supabase.rpc('get_guest_session_result', {
    p_phone: phone,
    p_passcode: passcode,
  });
  if (error) throw error;
  if (!data || data.length === 0) return null;
  const row = data[0];
  return {
    session: {
      id: row.session_id,
      full_name: row.full_name,
      phone: row.phone,
      email: row.email || '',
      passcode: row.passcode,
      bundle_id: row.bundle_id || null,
      created_at: row.created_at,
    },
    leads: row.leads || [],
  };
}

/** Lấy 1 bộ đề theo id (kể cả hidden nếu được phép qua RLS) */
export async function fetchExamBundleById(bundleId: string): Promise<ExamBundle | null> {
  const { data, error } = await supabase
    .from('exam_bundles')
    .select('*')
    .eq('id', bundleId)
    .single();
  if (error) {
    if ((error as any)?.code === 'PGRST116') return null; // not found
    throw error;
  }
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    description: data.description || '',
    exam_ids: data.exam_ids || [],
    visibility: data.visibility || 'public',
    created_by: data.created_by || null,
    created_at: data.created_at,
  };
}

// ==================== Bundle Assignments (giao bộ đề cho lớp) ====================

export interface BundleAssignment {
  id: string;
  bundle_id: string;
  class_id: string;
  title: string;
  description: string;
  deadline: string;
  created_by: string;
  created_at: string;
  class_name?: string;
  bundle?: ExamBundle;
}

export interface CreateBundleAssignmentPayload {
  bundle_id: string;
  class_id: string;
  title: string;
  description?: string;
  deadline: string;
  created_by: string;
}

/**
 * Danh sách các lớp được giao 1 bộ đề (kèm tên lớp) — dùng trong admin
 */
export async function fetchBundleAssignments(bundleId: string): Promise<BundleAssignment[]> {
  const { data, error } = await supabase
    .from('bundle_assignments')
    .select(`
      *,
      classes:class_id ( name )
    `)
    .eq('bundle_id', bundleId)
    .order('deadline', { ascending: true });

  if (error) throw error;
  return (data || []).map((a: any) => ({
    id: a.id,
    bundle_id: a.bundle_id,
    class_id: a.class_id,
    title: a.title,
    description: a.description || '',
    deadline: a.deadline,
    created_by: a.created_by,
    created_at: a.created_at,
    class_name: a.classes?.name || 'Unknown Class',
  }));
}

/**
 * Giao 1 bộ đề cho 1 lớp (thi giữa kỳ / cuối kỳ)
 */
export async function createBundleAssignment(payload: CreateBundleAssignmentPayload): Promise<void> {
  const { error } = await supabase
    .from('bundle_assignments')
    .insert({
      bundle_id: payload.bundle_id,
      class_id: payload.class_id,
      title: payload.title,
      description: payload.description || '',
      deadline: payload.deadline,
      created_by: payload.created_by,
    });

  if (error) throw error;
}

/**
 * Gỡ giao bộ đề cho lớp
 */
export async function deleteBundleAssignment(id: string): Promise<void> {
  const { error } = await supabase
    .from('bundle_assignments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Các bộ đề được giao cho student (qua class) kèm deadline + thông tin bundle
 */
export async function fetchStudentBundleAssignments(studentId: string): Promise<BundleAssignment[]> {
  // Lấy các lớp của student
  const { data: csData, error: csError } = await supabase
    .from('class_students')
    .select('class_id')
    .eq('student_id', studentId);

  if (csError) throw csError;
  if (!csData || csData.length === 0) return [];

  const classIds = csData.map(c => c.class_id);

  const { data: classes } = await supabase
    .from('classes')
    .select('id, name')
    .in('id', classIds);

  const classMap = new Map(classes?.map((c: any) => [c.id, c.name]) || []);

  const { data, error } = await supabase
    .from('bundle_assignments')
    .select(`
      *,
      bundles:bundle_id ( id, title, description, exam_ids, visibility, created_at )
    `)
    .in('class_id', classIds)
    .order('deadline', { ascending: true });

  if (error) throw error;
  return (data || []).map((a: any) => ({
    id: a.id,
    bundle_id: a.bundle_id,
    class_id: a.class_id,
    title: a.title,
    description: a.description || '',
    deadline: a.deadline,
    created_by: a.created_by,
    created_at: a.created_at,
    class_name: classMap.get(a.class_id) || 'Unknown Class',
    bundle: a.bundles
      ? {
          id: a.bundles.id,
          title: a.bundles.title,
          description: a.bundles.description || '',
          exam_ids: a.bundles.exam_ids || [],
          visibility: a.bundles.visibility || 'public',
          created_at: a.bundles.created_at,
        }
      : undefined,
  }));
}

// ============================================================
// Guest Grading — gán giáo viên chấm bài cho guest leads
// ============================================================

export interface TeacherWithStats {
  id: string;
  email: string;
  full_name: string;
  classes_count: number;
  students_count: number;
  assigned_pending: number;
  graded_count: number;
}

/**
 * Danh sách giáo viên kèm thống kê:
 * số lớp phụ trách, số học viên, số lead đang chờ chấm, số lead đã chấm.
 */
export async function fetchTeachersWithStats(): Promise<TeacherWithStats[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'teacher')
    .order('full_name');

  if (error) throw error;
  const teachers = data || [];
  if (teachers.length === 0) return [];

  // class_teachers: teacher -> set(class_id)
  const { data: ctData } = await supabase.from('class_teachers').select('teacher_id, class_id');
  const teacherClasses = new Map<string, Set<string>>();
  (ctData || []).forEach((r: any) => {
    if (!teacherClasses.has(r.teacher_id)) teacherClasses.set(r.teacher_id, new Set());
    teacherClasses.get(r.teacher_id)!.add(r.class_id);
  });

  // class_students: class_id -> set(student_id)
  const { data: csData } = await supabase.from('class_students').select('class_id, student_id');
  const classStudents = new Map<string, Set<string>>();
  (csData || []).forEach((r: any) => {
    if (!classStudents.has(r.class_id)) classStudents.set(r.class_id, new Set());
    classStudents.get(r.class_id)!.add(r.student_id);
  });

  // exam_leads: trạng thái gán / chấm
  const { data: leadsData } = await supabase
    .from('exam_leads')
    .select('assigned_teacher_id, grading_status, graded_by');

  const leads = leadsData || [];

  return teachers.map(t => {
    const classIds = teacherClasses.get(t.id) || new Set<string>();
    const studentIds = new Set<string>();
    classIds.forEach(cid => {
      (classStudents.get(cid) || new Set<string>()).forEach(sid => studentIds.add(sid));
    });

    const assignedPending = leads.filter(l =>
      l.assigned_teacher_id === t.id && l.grading_status !== 'graded'
    ).length;
    const gradedCount = leads.filter(l =>
      l.graded_by === t.id || (l.assigned_teacher_id === t.id && l.grading_status === 'graded')
    ).length;

    return {
      id: t.id,
      email: t.email || '',
      full_name: t.full_name || '',
      classes_count: classIds.size,
      students_count: studentIds.size,
      assigned_pending: assignedPending,
      graded_count: gradedCount,
    };
  });
}

/**
 * Danh sách lead cần chấm (writing/speaking...).
 * - Admin: tất cả leads (không truyền teacherId)
 * - Teacher: chỉ leads được gán cho mình hoặc mình đã chấm (truyền teacherId)
 * Trả về kèm tên giáo viên được gán + người chấm.
 */
export async function fetchGuestLeadsForGrading(opts?: { teacherId?: string }): Promise<any[]> {
  let query = supabase
    .from('exam_leads')
    .select(`
      *,
      assigned_teacher:assigned_teacher_id ( id, email, full_name ),
      grader:graded_by ( id, email, full_name )
    `)
    .order('created_at', { ascending: false });

  if (opts?.teacherId) {
    query = query.or(`assigned_teacher_id.eq.${opts.teacherId},graded_by.eq.${opts.teacherId}`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((l: any) => ({
    ...l,
    assigned_teacher_name: l.assigned_teacher?.full_name || l.assigned_teacher?.email || null,
    grader_name: l.grader?.full_name || l.grader?.email || null,
  }));
}

/**
 * Gán giáo viên chấm bài cho một lead (admin).
 * Nếu teacherId = null → bỏ gán, về trạng thái unassigned.
 */
export async function assignTeacherToLead(leadId: string, teacherId: string | null): Promise<void> {
  const updates = teacherId
    ? { assigned_teacher_id: teacherId, grading_status: 'assigned' }
    : { assigned_teacher_id: null, grading_status: 'unassigned' };

  const { error } = await supabase
    .from('exam_leads')
    .update(updates)
    .eq('id', leadId);

  if (error) throw error;
}

/**
 * Giáo viên (hoặc admin) chấm điểm xong một lead guest.
 * Cập nhật điểm, feedback và chuyển trạng thái sang 'graded'.
 */
export async function submitGuestLeadGrade(
  leadId: string,
  score: number,
  feedback: string,
  graderId: string
): Promise<void> {
  const { error } = await supabase
    .from('exam_leads')
    .update({
      grade_score: score,
      grade_feedback: feedback,
      graded_by: graderId,
      graded_at: new Date().toISOString(),
      grading_status: 'graded',
    })
    .eq('id', leadId);

  if (error) throw error;
}

/**
 * Thống kê tổng quan cho Admin Dashboard.
 */
export async function fetchAdminStats() {
  const countAll = async (table: string) => {
    const { count } = await supabase
      .from(table as any)
      .select('*', { count: 'exact', head: true });
    return count || 0;
  };

  const countProfilesByRole = async (role: string) => {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', role);
    return count || 0;
  };

  // Guest Leads: thống kê theo hierarchy — mỗi người / 1 lần thi bộ = 1 lead.
  // Nhóm toàn bộ exam_leads theo session_id (bộ đề) hoặc id (lead lẻ); session rỗng
  // (tạo ra nhưng chưa làm kỹ năng nào) không tính là lead.
  const { data: leadRows } = await supabase
    .from('exam_leads')
    .select('id, session_id, skill_type, grading_status');

  const leadGroups = new Map<string, Map<string, string>>();
  for (const l of leadRows || []) {
    const key = l.session_id || l.id;
    if (!leadGroups.has(key)) leadGroups.set(key, new Map());
    leadGroups.get(key)!.set(l.skill_type, l.grading_status);
  }

  // Chỉ writing/speaking cần chấm thủ công; reading/listening tự chấm ngay khi nộp.
  const MANUAL_SKILLS = ['writing', 'speaking'];
  let pendingCount = 0;
  let gradedCount = 0;
  for (const skills of leadGroups.values()) {
    const needsManual = [...skills.entries()].some(
      ([skill, st]) => MANUAL_SKILLS.includes(skill) && st !== 'graded'
    );
    if (needsManual) pendingCount++;
    else gradedCount++;
  }

  const [exams, students, teachers, classes] = await Promise.all([
    countAll('exams'),
    countProfilesByRole('student'),
    countProfilesByRole('teacher'),
    countAll('classes'),
  ]);

  return {
    exams,
    students,
    teachers,
    classes,
    leads: leadGroups.size,
    pending_grading: pendingCount,
    graded: gradedCount,
  };
}

// ============================================================
// Admin user management — tạo / xóa tài khoản (migration 007_admin_tools.sql)
// ============================================================

/**
 * Tạo tài khoản student/teacher ngay từ app.
 * Gọi hàm SECURITY DEFINER admin_create_user trên DB (chỉ admin được gọi).
 */
export async function adminCreateUser(
  email: string,
  password: string,
  fullName: string,
  role: 'student' | 'teacher'
): Promise<string> {
  const { data, error } = await supabase.rpc('admin_create_user', {
    p_email: email,
    p_password: password,
    p_full_name: fullName,
    p_role: role,
  });
  if (error) throw error;
  return data as string;
}

/**
 * Xóa tài khoản (admin). Cascade xuống profiles, exam_results, ...
 */
export async function adminDeleteUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_user', { p_user_id: userId });
  if (error) throw error;
}

// ============================================================
// Admin database browser — xem / xóa / dọn dẹp các bảng
// ============================================================

interface AdminTableInfo {
  name: string;
  label: string;
  deletable: boolean;
  note?: string;
}

/** Danh sách bảng có thể quản lý từ app (bỏ auth schema) */
export const ADMIN_DB_TABLES: AdminTableInfo[] = [
  { name: 'profiles', label: 'Hồ sơ người dùng', deletable: false, note: 'Xóa user bằng nút ở tab Teachers / Students' },
  { name: 'exams', label: 'Đề thi', deletable: true },
  { name: 'passages', label: 'Đoạn văn', deletable: true },
  { name: 'questions', label: 'Câu hỏi', deletable: true },
  { name: 'exam_results', label: 'Kết quả làm bài', deletable: true },
  { name: 'exam_leads', label: 'Leads thi thử', deletable: true },
  { name: 'classes', label: 'Lớp học', deletable: true },
  { name: 'class_teachers', label: 'Giáo viên - Lớp', deletable: true },
  { name: 'class_students', label: 'Học viên - Lớp', deletable: true },
  { name: 'assignments', label: 'Bài tập (assignments)', deletable: true },
  { name: 'writing_submissions', label: 'Bài nộp Writing', deletable: true },
  { name: 'writing_grades', label: 'Điểm Writing', deletable: true },
  { name: 'speaking_submissions', label: 'Bài nộp Speaking', deletable: true },
  { name: 'speaking_grades', label: 'Điểm Speaking', deletable: true },
];

/** Đếm số dòng của tất cả bảng (dùng cho màn hình Database) */
export async function fetchAdminTableCounts(): Promise<Record<string, number>> {
  const entries = await Promise.all(
    ADMIN_DB_TABLES.map(async t => {
      const { count } = await supabase
        .from(t.name as any)
        .select('*', { count: 'exact', head: true });
      return [t.name, count || 0] as const;
    })
  );
  return Object.fromEntries(entries);
}

/** Lấy tối đa `limit` dòng của một bảng */
export async function fetchAdminTableRows(tableName: string, limit = 100): Promise<any[]> {
  const { data, error } = await supabase
    .from(tableName as any)
    .select('*')
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/** Xóa một dòng theo id */
export async function deleteAdminTableRow(tableName: string, rowId: string): Promise<void> {
  const { error } = await supabase
    .from(tableName as any)
    .delete()
    .eq('id', rowId);
  if (error) throw error;
}

/** Xóa toàn bộ dòng trong bảng (dọn dẹp) */
export async function clearAdminTable(tableName: string): Promise<void> {
  const { error } = await supabase
    .from(tableName as any)
    .delete()
    .not('id', 'is', null);
  if (error) throw error;
}
