import React, { useState } from 'react';
import { ArrowLeft, KeyRound, Phone, Search, Loader2, CheckCircle2, MessageSquare } from 'lucide-react';
import { fetchGuestResult, fetchExamById } from '../lib/supabaseService';
import { ResultView } from './ResultView';
import { VstepExamSet } from '../data/vstepReadingMock';

interface GuestResultLookupProps {
  initialPhone?: string;
  initialPasscode?: string;
  onBack: () => void;
  onHome: () => void;
}

export const GuestResultLookup: React.FC<GuestResultLookupProps> = ({
  initialPhone = '',
  initialPasscode = '',
  onBack,
  onHome,
}) => {
  const [phone, setPhone] = useState(initialPhone);
  const [passcode, setPasscode] = useState(initialPasscode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lead, setLead] = useState<any | null>(null);
  const [exam, setExam] = useState<VstepExamSet | null>(null);
  const [examLoading, setExamLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone.trim() || phone.trim().length < 9) {
      setError('Vui lòng nhập số điện thoại hợp lệ.');
      return;
    }
    if (!passcode.trim()) {
      setError('Vui lòng nhập passcode.');
      return;
    }

    setLoading(true);
    try {
      const result = await fetchGuestResult(phone.trim(), passcode.trim().toUpperCase());
      if (!result) {
        setError('Không tìm thấy kết quả. Vui lòng kiểm tra lại số điện thoại và passcode.');
        return;
      }
      setLead(result);
      setExam(null);

      // Chỉ tải đề chi tiết với reading/listening (có chấm tự động)
      const canAutoGrade = result.skill_type === 'reading' || result.skill_type === 'listening';
      if (result.exam_id && canAutoGrade) {
        setExamLoading(true);
        try {
          const examData = await fetchExamById(result.exam_id);
          setExam(examData);
        } catch (err) {
          console.error('Failed to fetch exam for guest result:', err);
          setExam(null);
        } finally {
          setExamLoading(false);
        }
      }
    } catch (err: any) {
      console.error('Guest lookup failed:', err);
      setError('Không thể tra cứu kết quả. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const canAutoGrade = lead?.skill_type === 'reading' || lead?.skill_type === 'listening';

  const formatTime = (s?: number | null) => {
    if (!s && s !== 0) return '-';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  // ---- Đã xác minh + đang tải đề ----
  if (lead && examLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  // ---- Đã xác minh + reading/listening + có đề → chi tiết như student ----
  if (lead && canAutoGrade && exam && exam.passages.length > 0) {
    const questions = exam.passages.flatMap(p => p.questions);
    if (questions.length > 0) {
      const results = questions.map(q => {
        const userAnswer = lead.user_answers?.[q.id] ?? null;
        const isCorrect = userAnswer === q.correctAnswer;
        return { question: q, userAnswer, isCorrect };
      });
      const correctCount = results.filter(r => r.isCorrect).length;
      const totalCount = questions.length;
      const percentage = totalCount ? correctCount / totalCount : 0;
      const vstepScore = Math.round(percentage * 10 * 10) / 10;
      const timeTaken = lead.time_spent_seconds ?? 0;

      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
          <div className="flex justify-end p-4">
            <button onClick={onHome} className="text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 underline text-sm">
              Back to Dashboard
            </button>
          </div>
          <ResultView
            correctCount={correctCount}
            totalCount={totalCount}
            percentage={percentage}
            vstepScore={vstepScore}
            timeTaken={timeTaken}
            results={results}
            passages={exam.passages}
            onReset={onHome}
            resetLabel="Về trang chủ"
          />
        </div>
      );
    }
  }

  // ---- Đã xác minh: không có chi tiết tự chấm (writing/speaking, đề đã xóa) ----
  if (lead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-10 px-4 md:px-8">
        <div className="max-w-xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-10 text-center">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
              <MessageSquare size={40} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-indigo-900 dark:text-gray-100 mb-3">Đã tìm thấy bài thi của bạn!</h2>
            {canAutoGrade && lead.score_raw != null ? (
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                Bài thi <span className="font-semibold">{lead.exam_title || 'Practice Test'}</span> của bạn:
              </p>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                Bài thi <span className="font-semibold">{lead.exam_title || 'Practice Test'}</span> đã được ghi nhận.
                <br />
                Kết quả của bài thi này sẽ được chấm và gửi qua Zalo.
              </p>
            )}
            <div className="mb-8 p-4 rounded-xl bg-gray-50 dark:bg-gray-700 text-left space-y-2 text-sm">
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Họ tên</span><span className="font-semibold">{lead.full_name}</span>
              </div>
              {canAutoGrade && lead.score_raw != null && (
                <>
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Điểm</span>
                    <span className="font-semibold">{lead.score_vstep} (0-10)</span>
                  </div>
                  <div className="flex justify-between text-gray-700 dark:text-gray-300">
                    <span>Số câu đúng</span>
                    <span className="font-semibold">{lead.score_raw}/{lead.total_questions ?? '-'}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Thời gian làm bài</span><span>{formatTime(lead.time_spent_seconds)}</span>
              </div>
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Ngày thi</span><span>{formatDate(lead.created_at)}</span>
              </div>
            </div>
            <button
              onClick={onHome}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Form nhập sdt + passcode ----
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-10 px-4 md:px-8">
      <div className="max-w-md mx-auto">
        <button
          onClick={onBack}
          className="mb-6 text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 underline text-sm flex items-center gap-1"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-10">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={28} className="text-indigo-600" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-indigo-900 dark:text-gray-100 mb-2">Tra cứu kết quả</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nhập số điện thoại và passcode đã nhận qua Zalo để xem kết quả.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Số điện thoại</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901234567"
                  className="w-full pl-9 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Passcode</label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                  placeholder="A7K3-9PL2"
                  className="w-full pl-9 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200 font-mono tracking-wider"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={18} />}
              {loading ? 'Đang tra cứu...' : 'Xem kết quả'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-gray-400 dark:text-gray-500">
            Chưa có passcode? Hãy làm bài thi thử và để lại thông tin để nhận passcode qua Zalo.
          </p>
        </div>
      </div>
    </div>
  );
};
