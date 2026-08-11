import React, { useEffect, useState } from 'react';
import {
  fetchUserExamResults, fetchUserWritingSubmissions, fetchUserSpeakingSubmissions, fetchExamById,
} from '../lib/supabaseService';
import { ArrowLeft, Clock, Trophy, Loader2, Calendar, PenLine, Mic, Star } from 'lucide-react';
import { ResultView } from './ResultView';
import { VstepExamSet } from '../data/vstepReadingMock';
import { formatDateUS, formatTime, skillBadge, getVstepColor } from '../utils/format';

interface ExamHistoryProps {
  userId: string;
  onBack: () => void;
}

interface HistoryItem {
  key: string;
  kind: 'mcq' | 'writing' | 'speaking';
  examId: string;
  examTitle: string;
  skillType?: string;
  submittedAt: string;
  scoreRaw?: number;
  totalQuestions?: number;
  scoreVstep?: number;
  timeSpent?: number;
  submissions?: any[];
  raw?: any;
}

const groupByExam = (subs: any[], kind: 'writing' | 'speaking'): HistoryItem[] => {
  const map = new Map<string, HistoryItem>();
  for (const s of subs) {
    const key = `${kind}-${s.exam_id}`;
    let item = map.get(key);
    if (!item) {
      item = {
        key,
        kind,
        examId: s.exam_id,
        examTitle: s.exam_title || 'Practice Test',
        skillType: s.skill_type,
        submittedAt: s.submitted_at,
        submissions: [],
      };
      map.set(key, item);
    }
    item.submissions!.push(s);
    if (new Date(s.submitted_at).getTime() > new Date(item.submittedAt).getTime()) {
      item.submittedAt = s.submitted_at;
    }
  }
  return [...map.values()];
};

export const ExamHistory: React.FC<ExamHistoryProps> = ({ userId, onBack }) => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [reviewExam, setReviewExam] = useState<VstepExamSet | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [results, writing, speaking] = await Promise.all([
          fetchUserExamResults(userId),
          fetchUserWritingSubmissions(userId),
          fetchUserSpeakingSubmissions(userId),
        ]);

        const mcqItems: HistoryItem[] = (results || []).map((r: any) => ({
          key: `mcq-${r.id}`,
          kind: 'mcq',
          examId: r.exam_id,
          examTitle: r.exams?.title || 'Practice Test',
          skillType: r.exams?.skill_type,
          submittedAt: r.submitted_at,
          scoreRaw: r.score_raw,
          totalQuestions: r.total_questions,
          scoreVstep: r.score_vstep,
          timeSpent: r.time_spent_seconds,
          raw: r,
        }));

        const merged = [
          ...mcqItems,
          ...groupByExam(writing || [], 'writing'),
          ...groupByExam(speaking || [], 'speaking'),
        ].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

        setItems(merged);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const handleReview = async (result: any) => {
    setSelectedResult(result);
    setReviewLoading(true);
    try {
      const exam = await fetchExamById(result.exam_id);
      setReviewExam(exam);
    } catch (err) {
      console.error('Failed to load exam for review:', err);
    } finally {
      setReviewLoading(false);
    }
  };

  const wordCount = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0;

  // ---------------- Writing / Speaking detail (review) ----------------
  if (selectedItem) {
    const { kind, examTitle, submissions } = selectedItem;
    const gradeOf = (s: any) => s?.grade || null;
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <header className="bg-gradient-to-r from-indigo-900 to-indigo-700 text-white shadow-lg">
          <div className="max-w-5xl mx-auto px-6 md:px-8 py-4 flex items-center justify-between">
            <button onClick={() => setSelectedItem(null)} className="flex items-center gap-2 text-indigo-200 hover:text-white transition-colors">
              <ArrowLeft size={20} />
              Back to History
            </button>
            <h1 className="text-lg md:text-xl font-bold flex items-center gap-2 truncate">
              {kind === 'writing' ? <PenLine size={20} className="text-emerald-300" /> : <Mic size={20} className="text-rose-300" />}
              <span className="truncate">{examTitle}</span>
            </h1>
            <div />
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 md:px-8 py-8 space-y-6">
          {(submissions || []).map((s: any, i: number) => {
            const grade = gradeOf(s);
            return (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-indigo-900 dark:text-gray-100">
                      {kind === 'writing' ? `Task ${s.task_id}` : `Part ${s.passage_id} — ${s.passage_title || 'Speaking'}`}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatDateUS(s.submitted_at)}
                      {kind === 'writing' && s.task_type ? ` · ${s.task_type}` : ''}
                      {kind === 'speaking' && s.duration_seconds ? ` · ${s.duration_seconds}s` : ''}
                    </p>
                  </div>
                  {grade ? (
                    <div className="flex items-center gap-1.5">
                      <Star size={16} className="text-amber-500 fill-amber-500" />
                      <span className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{grade.score}</span>
                      <span className="text-xs text-gray-400">/10</span>
                    </div>
                  ) : (
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                      Chờ chấm
                    </span>
                  )}
                </div>

                {kind === 'writing' ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Bài làm của bạn</span>
                      <span className="text-xs text-gray-400">{wordCount(s.content)} từ</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed border border-gray-200 dark:border-gray-600 text-sm">
                      {s.content || <span className="text-gray-400 italic">Không có nội dung</span>}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Bản ghi âm của bạn</span>
                    </div>
                    {s.audio_url ? (
                      <audio controls src={s.audio_url} className="w-full" />
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-400">Không có file ghi âm.</p>
                    )}
                  </div>
                )}

                {grade && (
                  <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <div className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold mb-1">
                      Nhận xét của giáo viên{grade.is_ai ? ' (AI)' : ''}
                      {grade.graded_at ? ` · ${formatDateUS(grade.graded_at)}` : ''}
                    </div>
                    {grade.feedback ? (
                      <p className="text-sm text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap leading-relaxed">{grade.feedback}</p>
                    ) : (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 italic">Không có nhận xét chi tiết.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </main>
      </div>
    );
  }

  // ---------------- MCQ review ----------------
  if (selectedResult) {
    if (reviewLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 flex items-center justify-center">
          <Loader2 size={40} className="animate-spin text-indigo-600" />
        </div>
      );
    }
    if (reviewExam) {
      const totalQuestions = reviewExam.passages.reduce((s, p) => s + p.questions.length, 0);
      const allQuestions = reviewExam.passages.flatMap(p => p.questions);
      const resultsData = allQuestions.map(q => {
        const userAnswer = selectedResult.user_answers?.[q.id] ?? null;
        const isCorrect = userAnswer === q.correctAnswer;
        return { question: q, userAnswer, isCorrect };
      });

      return (
        <div>
          <div className="bg-indigo-900 text-white px-8 py-4 flex items-center justify-between shadow-lg">
            <button onClick={() => setSelectedResult(null)} className="flex items-center gap-2 text-indigo-200 hover:text-white transition-colors">
              <ArrowLeft size={20} />
              Back to History
            </button>
            <span className="text-lg font-bold">Review: {reviewExam.examTitle}</span>
          </div>
          <ResultView
            correctCount={selectedResult.score_raw}
            totalCount={totalQuestions}
            percentage={selectedResult.score_raw / totalQuestions}
            vstepScore={selectedResult.score_vstep}
            timeTaken={selectedResult.time_spent_seconds}
            results={resultsData}
            passages={reviewExam.passages}
            onReset={() => setSelectedResult(null)}
          />
        </div>
      );
    }
  }

  // ---------------- History list ----------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="bg-gradient-to-r from-indigo-900 to-indigo-700 text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-6 md:px-8 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-indigo-200 hover:text-white transition-colors">
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Trophy size={22} className="text-yellow-400" />
            Exam History
          </h1>
          <div />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 md:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={40} className="animate-spin text-indigo-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-16 text-center">
            <Trophy size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-bold text-indigo-900 dark:text-gray-100 mb-2">No History Yet</h2>
            <p className="text-gray-600 dark:text-gray-400">Complete a test to see your results here.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-100 dark:border-indigo-900">
                    <th className="text-left py-4 px-6 text-indigo-900 dark:text-gray-100 font-semibold">Date</th>
                    <th className="text-left py-4 px-6 text-indigo-900 dark:text-gray-100 font-semibold">Exam</th>
                    <th className="text-center py-4 px-6 text-indigo-900 dark:text-gray-100 font-semibold">
                      {items.some(i => i.kind === 'mcq') ? 'Correct' : 'Parts'}
                    </th>
                    <th className="text-center py-4 px-6 text-indigo-900 dark:text-gray-100 font-semibold">Score</th>
                    <th className="text-center py-4 px-6 text-indigo-900 dark:text-gray-100 font-semibold">Time</th>
                    <th className="text-right py-4 px-6 text-indigo-900 dark:text-gray-100 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isMcq = item.kind === 'mcq';
                    const isGraded = item.submissions?.some((s: any) => s?.grade);
                    const firstGrade = item.submissions?.find((s: any) => s?.grade)?.grade;
                    return (
                      <tr key={item.key} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <Calendar size={14} />
                            {formatDateUS(item.submittedAt)}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-gray-100 max-w-[220px] truncate">{item.examTitle}</span>
                            {skillBadge(item.skillType)}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {isMcq ? (
                            <span className="font-bold text-lg text-gray-800 dark:text-gray-200">
                              {item.scoreRaw}/{item.totalQuestions ?? 40}
                            </span>
                          ) : (
                            <span className="font-bold text-lg text-gray-800 dark:text-gray-200">
                              {item.submissions?.length || 0}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {isMcq ? (
                            <span className={`font-bold text-lg ${getVstepColor(item.scoreVstep || 0)}`}>
                              {item.scoreVstep}
                            </span>
                          ) : isGraded ? (
                            <span className="flex items-center justify-center gap-1">
                              <Star size={14} className="text-amber-500 fill-amber-500" />
                              <span className={`font-bold text-lg ${getVstepColor(firstGrade?.score || 0)}`}>
                                {firstGrade.score}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                              Chờ chấm
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center text-sm text-gray-600 dark:text-gray-400">
                          {isMcq ? (
                            <div className="flex items-center justify-center gap-1">
                              <Clock size={14} />
                              {formatTime(item.timeSpent || 0)}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => (isMcq ? handleReview(item.raw) : setSelectedItem(item))}
                            className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800/60 transition-colors text-sm font-medium"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
