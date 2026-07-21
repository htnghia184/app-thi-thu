import React, { useEffect, useState } from 'react';
import { fetchUserExamResults } from '../lib/supabaseService';
import { ArrowLeft, Clock, Trophy, Loader2, Calendar } from 'lucide-react';
import { ResultView } from './ResultView';
import { VstepExamSet } from '../data/vstepReadingMock';
import { fetchExamById } from '../lib/supabaseService';

interface ExamHistoryProps {
  userId: string;
  onBack: () => void;
}

export const ExamHistory: React.FC<ExamHistoryProps> = ({ userId, onBack }) => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [reviewExam, setReviewExam] = useState<VstepExamSet | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchUserExamResults(userId);
        setResults(data || []);
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

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const getVstepColor = (score: number) => {
    if (score >= 6.5) return 'text-green-600';
    if (score >= 5.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  // If reviewing a specific result
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
      <header className="bg-gradient-to-r from-indigo-900 to-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
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

      <main className="max-w-5xl mx-auto px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={40} className="animate-spin text-indigo-600" />
          </div>
        ) : results.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-16 text-center">
            <Trophy size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-indigo-900 mb-2">No History Yet</h2>
            <p className="text-gray-600">Complete a test to see your results here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-indigo-50 border-b border-indigo-100">
                  <th className="text-left py-4 px-6 text-indigo-900 font-semibold">Date</th>
                  <th className="text-left py-4 px-6 text-indigo-900 font-semibold">Exam</th>
                  <th className="text-center py-4 px-6 text-indigo-900 font-semibold">Score</th>
                  <th className="text-center py-4 px-6 text-indigo-900 font-semibold">VSTEP</th>
                  <th className="text-center py-4 px-6 text-indigo-900 font-semibold">Time</th>
                  <th className="text-right py-4 px-6 text-indigo-900 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r: any) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        {formatDate(r.submitted_at)}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-gray-900">
                      {r.exams?.title || 'Practice Test'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="font-bold text-lg">{r.score_raw}/40</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`font-bold text-lg ${getVstepColor(r.score_vstep)}`}>
                        {r.score_vstep}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center text-sm text-gray-600">
                      <div className="flex items-center justify-center gap-1">
                        <Clock size={14} />
                        {formatTime(r.time_spent_seconds)}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleReview(r)}
                        className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};
