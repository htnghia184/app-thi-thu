import { useState, useCallback, useEffect } from 'react';
import { Question, VstepExamSet } from '../data/vstepReadingMock';
import { submitExamResult, ExamResultPayload } from '../lib/supabaseService';

export interface UserAnswers {
  [questionId: number]: number | null;
}

const AUTO_SAVE_KEY = (examId: string) => `vstep-progress-${examId}`;

interface SavedProgress {
  userAnswers: UserAnswers;
  bookmarkedQuestions: number[];
  savedAt: number;
}

export function useVstepExamState(exam: VstepExamSet, userId?: string) {
  const allQuestions: Question[] = exam.passages.flatMap(p => p.questions);
  const saveKey = AUTO_SAVE_KEY(exam.id);

  // Restore saved progress
  const getSavedProgress = (): SavedProgress | null => {
    try {
      const raw = localStorage.getItem(saveKey);
      if (!raw) return null;
      return JSON.parse(raw) as SavedProgress;
    } catch {
      return null;
    }
  };

  const saved = getSavedProgress();

  const [userAnswers, setUserAnswers] = useState<UserAnswers>(saved?.userAnswers || {});
  const [currentPassageIndex, setCurrentPassageIndex] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [startTime] = useState<number>(Date.now());
  const [endTime, setEndTime] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Set<number>>(
    new Set(saved?.bookmarkedQuestions || [])
  );

  // Auto-save whenever answers or bookmarks change
  useEffect(() => {
    if (!isCompleted && !exam.id) return;
    const progress: SavedProgress = {
      userAnswers,
      bookmarkedQuestions: Array.from(bookmarkedQuestions),
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(saveKey, JSON.stringify(progress));
    } catch {
      // Silently fail (storage quota exceeded, etc.)
    }
  }, [userAnswers, bookmarkedQuestions, isCompleted, saveKey, exam.id]);

  const clearSavedProgress = useCallback(() => {
    try {
      localStorage.removeItem(saveKey);
    } catch {
      // Silently fail
    }
  }, [saveKey]);

  const answerQuestion = useCallback((questionId: number, answerIndex: number | null) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
  }, []);

  const toggleBookmark = useCallback((questionId: number) => {
    setBookmarkedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }, []);

  const isBookmarked = useCallback((questionId: number): boolean => {
    return bookmarkedQuestions.has(questionId);
  }, [bookmarkedQuestions]);

  const getBookmarkedCount = useCallback((): number => {
    return bookmarkedQuestions.size;
  }, [bookmarkedQuestions]);

  const selectPassage = useCallback((index: number) => {
    if (index >= 0 && index < exam.passages.length) {
      setCurrentPassageIndex(index);
    }
  }, [exam.passages.length]);

  const goToQuestion = useCallback((questionId: number) => {
    const passageIndex = exam.passages.findIndex(p =>
      p.questions.some(q => q.id === questionId)
    );
    if (passageIndex !== -1) {
      setCurrentPassageIndex(passageIndex);
    }
  }, [exam.passages]);

  const submitExam = useCallback(async () => {
    setIsCompleted(true);
    const now = Date.now();
    setEndTime(now);

    // Save result to Supabase if user is logged in
    if (userId) {
      setSubmitting(true);
      try {
        let correctCount = 0;
        allQuestions.forEach(q => {
          if (userAnswers[q.id] === q.correctAnswer) correctCount++;
        });
        const percentage = correctCount / allQuestions.length;
        const vstepScore = Math.round(percentage * 10 * 10) / 10;
        const timeSpent = Math.floor((now - startTime) / 1000);

        const resultData: ExamResultPayload = {
          user_id: userId,
          exam_id: exam.id,
          score_raw: correctCount,
          score_vstep: vstepScore,
          time_spent_seconds: timeSpent,
          total_questions: allQuestions.length,
          user_answers: userAnswers as Record<string, number | null>,
        };

        await submitExamResult(resultData);
        clearSavedProgress();
      } catch (err) {
        console.error('Failed to save exam result:', err);
      } finally {
        setSubmitting(false);
      }
    }
  }, [userId, exam.id, allQuestions, userAnswers, startTime]);

  const resetExam = useCallback(() => {
    setUserAnswers({});
    setCurrentPassageIndex(0);
    setIsCompleted(false);
    setEndTime(null);
    setBookmarkedQuestions(new Set());
    clearSavedProgress();
  }, [clearSavedProgress]);

  const calculateResults = useCallback(() => {
    let correctCount = 0;
    const results = allQuestions.map(q => {
      const userAnswer = userAnswers[q.id];
      const isCorrect = userAnswer === q.correctAnswer;
      if (isCorrect) correctCount++;
      return { question: q, userAnswer, isCorrect };
    });

    const percentage = correctCount / allQuestions.length;
    const vstepScore = Math.round(percentage * 10 * 10) / 10;

    const timeTaken = endTime
      ? Math.floor((endTime - startTime) / 1000)
      : Math.floor((Date.now() - startTime) / 1000);

    return { correctCount, totalCount: allQuestions.length, percentage, vstepScore, timeTaken, results };
  }, [userAnswers, allQuestions, startTime, endTime]);

  const getQuestionStatus = useCallback((questionId: number) => {
    return userAnswers[questionId] !== null && userAnswers[questionId] !== undefined
      ? 'answered'
      : 'unanswered';
  }, [userAnswers]);

  return {
    currentPassageIndex,
    userAnswers,
    isCompleted,
    submitting,
    bookmarkedQuestions,
    answerQuestion,
    toggleBookmark,
    isBookmarked,
    getBookmarkedCount,
    selectPassage,
    goToQuestion,
    submitExam,
    resetExam,
    calculateResults,
    getQuestionStatus,
  };
}
