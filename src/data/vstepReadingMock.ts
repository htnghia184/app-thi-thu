export type QuestionType =
  | 'main_idea'
  | 'detail'
  | 'vocabulary'
  | 'inference'
  | 'tone_purpose'
  | 'reference'
  | 'negative';

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  main_idea: 'Main Idea / Topic',
  detail: 'Detail / Specific Information',
  vocabulary: 'Vocabulary in Context',
  inference: 'Inference / Implication',
  tone_purpose: "Author's Tone / Purpose",
  reference: 'Reference / Pronoun',
  negative: 'Negative / Except',
};

export interface Question {
  id: number;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  questionType: QuestionType;
}

export interface Passage {
  id: number;
  title: string;
  passageText: string;
  audioUrl?: string;
  questions: Question[];
  recommendedMinutes?: number;
  /** Thời lượng (giây) — đề Speaking: giới hạn ghi âm mỗi phần; hết giờ tự dừng record */
  durationSeconds?: number;
  /** Thời gian chuẩn bị (giây) — đề Speaking: đếm ngược đọc đề trước khi tự bật ghi âm */
  prepSeconds?: number;
  /** Chỉ dùng cho đề writing: loại task (email/essay/letter) */
  taskType?: WritingTask['taskType'];
  wordLimit?: number;
  instructions?: string;
}

export interface WritingTask {
  id: number;
  taskNumber: number;
  taskType: 'email' | 'essay' | 'letter';
  prompt: string;
  wordLimit: number;
  instructions: string;
}

export interface VstepExamSet {
  id: string;
  examTitle: string;
  description: string;
  skillType: 'reading' | 'listening' | 'writing' | 'speaking';
  totalDurationMinutes: number;
  totalQuestions: number;
  passages: Passage[];
  writingTasks?: WritingTask[];
  createdAt: string;
  /** Trạng thái công khai của đề thi: 'public' ai cũng làm được (kể cả guest), 'private' chỉ dành cho học viên được giao */
  status?: 'public' | 'private';
}

export interface WritingSubmission {
  id: string;
  user_id: string;
  exam_id: string;
  task_id: number;
  content: string;
  task_type: string;
  submitted_at: string;
  user_name?: string;
  exam_title?: string;
}

export interface WritingGrade {
  id: string;
  submission_id: string;
  grader_id: string;
  score: number;
  feedback: string;
  criteria_scores?: any;
  graded_at: string;
  is_ai: boolean;
}
