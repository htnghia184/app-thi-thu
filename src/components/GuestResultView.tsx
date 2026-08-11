import React, { useState } from 'react';
import { CheckCircle, Loader2, Send, ArrowLeft, Phone, User, Mail, Info } from 'lucide-react';
import { VstepExamSet } from '../data/vstepReadingMock';
import { submitGuestResult, generatePasscode } from '../lib/supabaseService';
import { GuestResultLookup } from './GuestResultLookup';
// Ảnh QR Zalo OA đặt ở thư mục gốc của project (zalo-oa.jpg)
import zaloQr from '../../zalo-oa.jpg';

interface GuestResultViewProps {
  exam: VstepExamSet;
  result?: {
    correctCount: number;
    totalCount: number;
    vstepScore: number;
    timeTaken: number;
  } | null;
  userAnswers: Record<number, number | null>;
  writingAnswers?: Record<number, string>;
  /** Audio speaking của guest đã upload trong lúc ghi âm — lưu vào exam_leads để giáo viên chấm */
  speakingAudios?: any[];
  onDone: () => void;
}

export const GuestResultView: React.FC<GuestResultViewProps> = ({
  exam,
  result,
  userAnswers,
  writingAnswers,
  speakingAudios,
  onDone,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showLookup, setShowLookup] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Vui lòng nhập họ tên.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 9) {
      setError('Vui lòng nhập số điện thoại hợp lệ.');
      return;
    }

    setSubmitting(true);
    // Passcode chỉ lưu trong DB — KHÔNG hiển thị cho khách.
    // Khách nhận passcode qua Zalo OA sau khi nhắn tin / subscribe (admin xem mã ở tab Leads).
    const newPasscode = generatePasscode();
    try {
      await submitGuestResult({
        exam_id: exam.id,
        exam_title: exam.examTitle,
        skill_type: exam.skillType,
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        passcode: newPasscode,
        score_raw: result ? result.correctCount : null,
        score_vstep: result ? result.vstepScore : null,
        total_questions: result ? result.totalCount : (exam.totalQuestions || null),
        time_spent_seconds: result ? result.timeTaken : null,
        user_answers: Object.keys(userAnswers).length > 0 ? userAnswers : null,
        // Nội dung bài viết (writing) — giáo viên sẽ chấm ở tab "Guest Grading"
        writing_answers: writingAnswers && Object.keys(writingAnswers).length > 0 ? writingAnswers : null,
        // Audio speaking đã upload — giáo viên sẽ chấm ở tab "Guest Grading"
        speaking_audio: speakingAudios && speakingAudios.length > 0 ? speakingAudios : null,
      });
      setSubmitted(true);
    } catch (err: any) {
      console.error('Failed to save guest lead:', err);
      setError('Không thể gửi thông tin. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  // ------- Màn hình tra cứu kết quả (sdt + passcode) -------
  if (submitted && showLookup) {
    return (
      <GuestResultLookup
        initialPhone={phone}
        onBack={() => setShowLookup(false)}
        onHome={onDone}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-10 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onDone}
          className="mb-6 text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 underline text-sm flex items-center gap-1"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        {submitted ? (
          // ------- Màn hình thành công -------
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12 text-center">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={40} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-indigo-900 dark:text-gray-100 mb-3">
              Đã nhận thông tin của bạn!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              Cảm ơn <span className="font-semibold text-indigo-700 dark:text-indigo-300">{fullName}</span> đã hoàn thành bài thi <span className="font-semibold">{exam.examTitle}</span>.
              <br />
              Chúng tôi sẽ gửi <span className="font-semibold">mã tra cứu kết quả</span> qua Zalo OA sau khi bạn nhắn tin / subscribe.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 mb-8">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                Quét mã QR để nhắn tin & subscribe Zalo Official Account:
              </span>
              <img
                src={zaloQr}
                alt="Zalo OA QR"
                className="w-48 h-48 md:w-56 md:h-56 object-contain rounded-xl border border-gray-200 dark:border-gray-600 bg-white p-2"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={onDone}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Về trang chủ
              </button>
              <button
                onClick={() => setShowLookup(true)}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Tra cứu kết quả
              </button>
            </div>
          </div>
        ) : (
          // ------- Form để lại thông tin nhận kết quả -------
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 md:px-10 py-6 text-white">
              <h2 className="text-xl md:text-2xl font-bold mb-1">Hoàn thành bài thi!</h2>
              <p className="text-indigo-100 text-sm md:text-base">
                {exam.examTitle}
              </p>
            </div>

            <div className="p-6 md:p-10">
              <div className="flex items-start gap-3 mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <Info size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                  Để nhận kết quả chấm điểm chi tiết, bạn vui lòng để lại thông tin bên dưới.
                  Kết quả sẽ được gửi qua Zalo.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-8">
                <form onSubmit={handleSubmit} className="flex-1 space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="w-full pl-9 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Số điện thoại / Zalo <span className="text-red-500">*</span>
                    </label>
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
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Email <span className="text-gray-400 font-normal">(không bắt buộc)</span>
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-9 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"
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
                    disabled={submitting}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={18} />}
                    {submitting ? 'Đang gửi...' : 'Gửi để nhận kết quả'}
                  </button>
                </form>

                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 text-center">
                    Quét mã QR để nhắn tin & subscribe qua Zalo:
                  </span>
                  <img
                    src={zaloQr}
                    alt="Zalo OA QR"
                    className="w-48 h-48 md:w-52 md:h-52 object-contain rounded-xl border border-gray-200 dark:border-gray-600 bg-white p-2"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center leading-relaxed">
                    Nhắn tin & subscribe Zalo OA để nhận kết quả
                    <br />và tư vấn lộ trình học miễn phí.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
