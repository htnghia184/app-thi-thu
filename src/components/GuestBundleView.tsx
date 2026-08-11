import React, { useState } from 'react';
import {
  ArrowLeft, Layers, BookOpen, Headphones, BookMarked, Mic,
  CheckCircle, Loader2, Send, User, Phone, Mail, Info, Clock, GraduationCap, KeyRound,
} from 'lucide-react';
import { VstepExamSet } from '../data/vstepReadingMock';
import { ExamBundle } from '../lib/supabaseService';
import { GuestResultLookup } from './GuestResultLookup';
import zaloQr from '../../zalo-oa.jpg';

/** Kết quả 1 kỹ năng đã nộp trong bộ — được lưu để tạo session khi kết thúc */
export interface BundleSkillResult {
  examId: string;
  examTitle: string;
  skillType: string;
  score?: number | null;
  correctCount?: number | null;
  totalCount?: number | null;
  timeTaken?: number | null;
  userAnswers?: Record<number, number | null> | null;
  writingAnswers?: Record<number, string> | null;
  speakingAudios?: any[] | null;
  submittedAt: number;
}

interface GuestBundleViewProps {
  bundle: ExamBundle;
  /** Các đề để resolve exam_ids → thông tin kỹ năng (guest: chỉ public; student: tất cả) */
  exams: VstepExamSet[];
  /** Các kỹ năng đã nộp trong bộ */
  results: BundleSkillResult[];
  /** Guest phải để lại info để nhận passcode; student tự lưu kết quả vào tài khoản */
  isGuest: boolean;
  onStartSkill: (examId: string) => void;
  /** Guest kết thúc bộ → tạo session + gắn toàn bộ leads */
  onFinish: (info: { fullName: string; phone: string; email: string }) => Promise<void>;
  onBack: () => void;
  onHome: () => void;
}

const skillMeta: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  reading: { icon: BookOpen, label: 'Reading', color: 'from-indigo-500 to-indigo-700', bg: 'bg-indigo-100 text-indigo-700' },
  listening: { icon: Headphones, label: 'Listening', color: 'from-purple-500 to-purple-700', bg: 'bg-purple-100 text-purple-700' },
  writing: { icon: BookMarked, label: 'Writing', color: 'from-emerald-500 to-emerald-700', bg: 'bg-emerald-100 text-emerald-700' },
  speaking: { icon: Mic, label: 'Speaking', color: 'from-rose-500 to-rose-700', bg: 'bg-rose-100 text-rose-700' },
};
const skillOrder = ['reading', 'listening', 'writing', 'speaking'];

export const GuestBundleView: React.FC<GuestBundleViewProps> = ({
  bundle,
  exams,
  results,
  isGuest,
  onStartSkill,
  onFinish,
  onBack,
  onHome,
}) => {
  // stage: browse (chọn kỹ năng) → form (để lại info) → done (đã tạo session)
  const [stage, setStage] = useState<'browse' | 'form' | 'done'>('browse');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showLookup, setShowLookup] = useState(false);

  // Resolve các kỹ năng của bộ theo thứ tự reading → listening → writing → speaking
  const skillExams = exams
    .filter(e => bundle.exam_ids.includes(e.id))
    .sort((a, b) => {
      const ai = skillOrder.indexOf(a.skillType);
      const bi = skillOrder.indexOf(b.skillType);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  const missingCount = bundle.exam_ids.length - skillExams.length;
  const doneCount = results.length;

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) { setError('Vui lòng nhập họ tên.'); return; }
    if (!phone.trim() || phone.trim().length < 9) { setError('Vui lòng nhập số điện thoại hợp lệ.'); return; }
    setSubmitting(true);
    try {
      await onFinish({ fullName: fullName.trim(), phone: phone.trim(), email: email.trim() });
      setStage('done');
    } catch (err: any) {
      console.error('Failed to finish bundle session:', err);
      setError('Không thể gửi thông tin. Vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  /** Guest: mở form để lại info. Student: kết quả đã tự lưu vào tài khoản → màn thành công luôn */
  const handleFinishClick = () => {
    if (isGuest) setStage('form');
    else setStage('done');
  };

  // Tra cứu kết quả từ màn thành công
  if (showLookup) {
    return (
      <GuestResultLookup
        initialPhone={phone}
        onBack={() => setShowLookup(false)}
        onHome={onHome}
      />
    );
  }

  // ---- Màn hình thành công (đã tạo session, 1 passcode) ----
  if (stage === 'done') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-10 px-4 md:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12 text-center">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={40} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-indigo-900 dark:text-gray-100 mb-3">
              Hoàn thành bộ thi {bundle.title}!
            </h2>
            {isGuest ? (
              <>
                <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                  Cảm ơn <span className="font-semibold text-indigo-700 dark:text-indigo-300">{fullName}</span> đã hoàn thành{' '}
                  <span className="font-semibold">{doneCount}/{bundle.exam_ids.length}</span> kỹ năng của bộ.
                  <br />
                  Kết quả toàn bộ các kỹ năng được gom vào <span className="font-semibold">1 mã tra cứu</span>,
                  chúng tôi sẽ gửi qua Zalo OA sau khi bạn nhắn tin / subscribe.
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
                    onClick={onHome}
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
              </>
            ) : (
              <>
                <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                  Bạn đã hoàn thành <span className="font-semibold">{doneCount}/{bundle.exam_ids.length}</span> kỹ năng của bộ.
                  <br />
                  Kết quả từng kỹ năng đã được <span className="font-semibold text-indigo-700 dark:text-indigo-300">tự động lưu vào lịch sử làm bài</span> của bạn.
                </p>
                <button
                  onClick={onHome}
                  className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Về trang chủ
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Form để lại thông tin (1 lần, 1 passcode cho cả bộ) ----
  if (stage === 'form') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-10 px-4 md:px-8">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setStage('browse')}
            className="mb-6 text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 underline text-sm flex items-center gap-1"
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 md:px-10 py-6 text-white">
              <h2 className="text-xl md:text-2xl font-bold mb-1">Kết thúc bộ thi & nhận kết quả</h2>
              <p className="text-indigo-100 text-sm md:text-base">{bundle.title} — {doneCount}/{bundle.exam_ids.length} kỹ năng đã nộp</p>
            </div>

            <div className="p-6 md:p-10">
              <div className="flex items-start gap-3 mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <Info size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                  Bạn chỉ cần để lại thông tin <span className="font-semibold">1 lần duy nhất</span>.
                  Toàn bộ kết quả các kỹ năng đã thi sẽ được gom chung vào 1 mã tra cứu, gửi qua Zalo.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-8">
                <form onSubmit={handleFinish} className="flex-1 space-y-5">
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
        </div>
      </div>
    );
  }

  // ---- Browse: danh sách kỹ năng trong bộ ----
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-10 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="mb-6 text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 underline text-sm flex items-center gap-1"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        {/* Header bộ */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-6 md:p-8 text-white mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Layers size={24} />
            <h2 className="text-xl md:text-2xl font-bold">{bundle.title}</h2>
          </div>
          {bundle.description && (
            <p className="text-indigo-100 text-sm md:text-base mb-4">{bundle.description}</p>
          )}
          <div className="flex items-center gap-4 text-indigo-100 text-sm flex-wrap">
            <span className="flex items-center gap-1.5">
              <GraduationCap size={16} /> {bundle.exam_ids.length} kỹ năng
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle size={16} /> {doneCount}/{bundle.exam_ids.length} đã nộp
            </span>
            {isGuest ? (
              <span className="flex items-center gap-1.5">
                <KeyRound size={16} /> 1 passcode duy nhất khi kết thúc
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <CheckCircle size={16} /> Kết quả tự lưu vào tài khoản
              </span>
            )}
          </div>
        </div>

        {missingCount > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
            Có {missingCount} đề trong bộ đã bị gỡ hoặc chưa công khai.
          </div>
        )}

        {/* Danh sách kỹ năng */}
        <div className="space-y-4 mb-6">
          {skillExams.map(exam => {
            const meta = skillMeta[exam.skillType] || skillMeta.reading;
            const Icon = meta.icon;
            const result = results.find(r => r.examId === exam.id);
            const hasAutoScore = exam.skillType !== 'writing' && exam.skillType !== 'speaking';
            return (
              <div key={exam.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2.5 rounded-lg ${meta.bg} flex-shrink-0`}>
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          {meta.label}
                        </span>
                        {result && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            Đã nộp
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-indigo-900 dark:text-gray-100 truncate">{exam.examTitle}</h4>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span className="flex items-center gap-1"><Clock size={12} /> {exam.totalDurationMinutes} mins</span>
                        <span>{exam.totalQuestions} câu hỏi</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {result && hasAutoScore && result.score != null && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{result.score}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">VSTEP</div>
                      </div>
                    )}
                    {result && !hasAutoScore && (
                      <div className="text-right">
                        <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">Đang chờ chấm</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">Kết quả gửi qua Zalo</div>
                      </div>
                    )}
                    <button
                      onClick={() => onStartSkill(exam.id)}
                      className={`px-4 md:px-5 py-2.5 bg-gradient-to-r ${meta.color} text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-md hover:scale-105 text-sm`}
                    >
                      {result ? 'Làm lại' : 'Làm bài'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {skillExams.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center text-gray-500 dark:text-gray-400">
              Bộ thi này hiện chưa có đề công khai nào.
            </div>
          )}
        </div>

        {/* Kết thúc bộ */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">
          {isGuest ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              Bạn có thể thi vài kỹ năng hoặc tất cả các kỹ năng rồi bấm kết thúc.
              Chỉ cần để lại thông tin <span className="font-semibold text-indigo-600 dark:text-indigo-400">1 lần duy nhất</span> để nhận
              <span className="font-semibold"> 1 mã tra cứu</span> cho toàn bộ bộ thi.
            </p>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              Kết quả từng kỹ năng đã được tự động lưu vào lịch sử làm bài của bạn.
              Bấm hoàn thành để xem tổng kết bộ thi.
            </p>
          )}
          <button
            onClick={handleFinishClick}
            disabled={doneCount === 0}
            className={`w-full md:w-auto px-8 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-white ${
              doneCount === 0
                ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg'
            }`}
          >
            <CheckCircle size={18} />
            {isGuest
              ? `Kết thúc & nhận passcode (${doneCount} kỹ năng)`
              : `Hoàn thành bộ thi (${doneCount} kỹ năng)`}
          </button>
        </div>
      </div>
    </div>
  );
};
