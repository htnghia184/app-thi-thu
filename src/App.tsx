import { useState, useEffect, useCallback } from 'react';
import { VstepExamSet } from './data/vstepReadingMock';
import { useVstepExamState } from './hooks/useVstepExam';
import { useTimer } from './hooks/useTimer';
import { useHighlighter } from './hooks/useHighlighter';
import { useStrictMode } from './hooks/useStrictMode';
import { PassageView } from './components/PassageView';
import { PassageTimer } from './components/PassageTimer';
import { QuestionList } from './components/QuestionList';
import { QuestionMap } from './components/QuestionMap';
import { ListeningView } from './components/ListeningView';
import { WritingView } from './components/WritingView';
import { WritingGrading } from './components/WritingGrading';
import { SpeakingView } from './components/SpeakingView';
import { SpeakingGrading } from './components/SpeakingGrading';
import { ExamHeader } from './components/ExamHeader';
import { ResultView } from './components/ResultView';
import { WritingResultView } from './components/WritingResultView';
import { SpeakingResultView } from './components/SpeakingResultView';
import { GuestResultView } from './components/GuestResultView';
import { GuestResultLookup } from './components/GuestResultLookup';
import { GuestBundleView, BundleSkillResult } from './components/GuestBundleView';
import { ConfirmSubmitModal } from './components/ConfirmSubmitModal';
import { StudentDashboard } from './components/StudentDashboard';
import { ExamHistory } from './components/ExamHistory';
import { AdminLayout } from './admin/AdminLayout';
import { ExamList } from './admin/ExamList';
import { ExamForm } from './admin/ExamForm';
import { ExamPreview } from './admin/ExamPreview';
import { AuthModal } from './components/Auth/AuthModal';
import { AdminStudents } from './admin/AdminStudents';
import { AdminClasses } from './admin/AdminClasses';
import { AdminOverview } from './admin/AdminOverview';
import { AdminTeachers } from './admin/AdminTeachers';
import { AdminGuestGrading } from './admin/AdminGuestGrading';
import { AdminBundles } from './admin/AdminBundles';
import { AdminDatabase } from './admin/AdminDatabase';
import { StudentProfile } from './components/StudentProfile';
import { TeacherProfile } from './components/TeacherProfile';
import { getCurrentUser, getUserProfile, signOut, fetchExams, fetchPublicExams, deleteExam, upsertExam, fetchExamBundles, fetchExamBundleById, createGuestSession, submitGuestResult, generatePasscode, ExamBundle, GuestSession } from './lib/supabaseService';
import { Loader2, Shield, Headphones } from 'lucide-react';
import { useDarkMode } from './hooks/useDarkMode';
import logoBg from '../logo-without-background.png';

type Page = 'dashboard' | 'exam' | 'history' | 'profile' | 'bundle';

function App() {
  const { isDark, toggle: toggleDarkMode } = useDarkMode();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [page, setPage] = useState<Page>('dashboard');
  const [exams, setExams] = useState<VstepExamSet[]>([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<VstepExamSet | null>(null);
  const [editingExam, setEditingExam] = useState<VstepExamSet | null>(null);
  const [previewingExam, setPreviewingExam] = useState<VstepExamSet | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'overview' | 'exams' | 'students' | 'classes' | 'grading' | 'speaking_grading' | 'teachers' | 'guest_grading' | 'bundles' | 'database'>('overview');
  const [isTeacherView, setIsTeacherView] = useState(false);
  const [guestLookupOpen, setGuestLookupOpen] = useState(false);
  /** Bật khi vừa bấm Start làm bài → ListeningView tự phát chain ngay khi mount (tận dụng user gesture) */
  const [examAutoPlay, setExamAutoPlay] = useState(false);

  // Bộ đề thi thử (guest) — 4 kỹ năng gom 1 session / 1 passcode
  const [bundles, setBundles] = useState<ExamBundle[]>([]);
  const [selectedBundle, setSelectedBundle] = useState<ExamBundle | null>(null);
  const [bundleResults, setBundleResults] = useState<BundleSkillResult[]>([]);

  // Highlighter state
  const highlighter = useHighlighter();

  // Per-passage timer state
  const [showPassageTimer, setShowPassageTimer] = useState(false);
  const [passageTimes, setPassageTimes] = useState<number[]>([]);
  const [lockedPassages, setLockedPassages] = useState<boolean[]>([]);

  // Initialize passage times when exam starts
  useEffect(() => {
    if (selectedExam && selectedExam.passages.length > 0) {
      const n = selectedExam.passages.length;
      const perPassage = Math.floor(selectedExam.totalDurationMinutes / n);
      setPassageTimes(new Array(n).fill(perPassage));
      setLockedPassages(new Array(n).fill(false));
      // Reset timer theo duration mới (đặc biệt speaking = tổng các part, không phải 60 mặc định)
      resetTimer();
    }
  }, [selectedExam?.id, selectedExam?.passages?.length]);

  // Writing-specific state
  const [writingAnswers, setWritingAnswers] = useState<Record<number, string>>({});
  const [writingSubmitted, setWritingSubmitted] = useState(false);
  /** Audio speaking của guest đã upload (chờ gắn vào exam_leads khi để lại thông tin) */
  const [guestSpeakingAudios, setGuestSpeakingAudios] = useState<any[]>([]);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          const profile = await getUserProfile(currentUser.id);
          const role = profile?.role || 'student';
          setUserRole(role);
          if (role === 'teacher') {
            setIsTeacherView(true);
            setAdminTab('exams');
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Load exams from Supabase
  const loadExams = useCallback(async (publicOnly = false) => {
    setExamsLoading(true);
    try {
      const supabaseExams = publicOnly ? await fetchPublicExams() : await fetchExams();
      setExams(supabaseExams || []);
    } catch (err: any) {
      console.error('Failed to load exams:', err);
      setExams([]);
    } finally {
      setExamsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadExams(userRole === 'guest');
    }
  }, [user, userRole, loadExams]);

  // Guest/Student: tải các bộ đề thi thử (guest chỉ thấy public; student thấy public + private)
  useEffect(() => {
    if (userRole !== 'guest' && userRole !== 'student') { setBundles([]); return; }
    fetchExamBundles(userRole === 'guest' ? { guestOnly: true } : undefined)
      .then(setBundles)
      .catch(err => console.error('Failed to load exam bundles:', err));
  }, [userRole]);

  const examState = useVstepExamState(
    selectedExam || { id: '', examTitle: '', description: '', skillType: 'reading', totalDurationMinutes: 60, totalQuestions: 0, passages: [], createdAt: '' },
    user?.id
  );

  // Speaking: tổng thời gian = Σ (chuẩn bị + ghi âm) của tất cả các part, không dùng duration tổng
  const speakingTotalMinutes =
    selectedExam?.skillType === 'speaking'
      ? selectedExam.passages.reduce(
          (sum, p) =>
            sum +
            (p.prepSeconds && p.prepSeconds > 0 ? p.prepSeconds : 60) +
            (p.durationSeconds || 0),
          0
        ) / 60
      : null;

  const { minutes, seconds, reset: resetTimer } = useTimer(
    (speakingTotalMinutes ?? selectedExam?.totalDurationMinutes) || 60,
    () => {
      if (selectedExam?.skillType === 'writing') {
        setWritingSubmitted(true);
      } else {
        examState.submitExam();
      }
    },
  );

  // Strict mode (anti-cheat) theo bộ đề — chạy xuyên suốt bundle, tự nộp sau 3 lần vi phạm
  const handleStrictLimit = useCallback(() => {
    if (!selectedExam) return;
    if (selectedExam.skillType === 'writing') {
      setWritingSubmitted(true);
    } else {
      examState.submitExam();
    }
  }, [selectedExam, examState]);
  const strictMode = useStrictMode(handleStrictLimit);

  const handleAuthSuccess = () => {
    getCurrentUser().then(async (u) => {
      if (u) {
        setUser(u);
        const profile = await getUserProfile(u.id);
        const role = profile?.role || 'student';
        setUserRole(role);
        if (role === 'teacher') {
          setIsTeacherView(true);
          setAdminTab('exams');
        }
      }
    });
  };

  const handleGuestLogin = () => {
    // Guest là người dùng ảo (không có tài khoản Supabase) — chỉ được làm đề public
    setUser({ id: '', email: 'Guest', full_name: 'Guest', isGuest: true });
    setUserRole('guest');
    setIsAdmin(false);
    setIsTeacherView(false);
    setPage('dashboard');
  };

  const handleLogout = async () => {
    if (userRole !== 'guest') {
      await signOut();
    }
    setUser(null);
    setUserRole(null);
    setIsAdmin(false);
    setIsTeacherView(false);
    setSelectedExam(null);
    setExams([]);
    setPage('dashboard');
  };

  const handleStartExam = (examId: string) => {
    const exam = exams.find(e => e.id === examId);
    if (exam) {
      setSelectedExam(exam);
      setWritingAnswers({});
      setWritingSubmitted(false);
      setGuestSpeakingAudios([]);
      // Bộ đề bật anti-cheat → vào strict mode (fullscreen, chặn tab mới...) ngay khi bắt đầu làm bài
      if (selectedBundle?.strict_mode) {
        strictMode.start();
      }
      // Cho ListeningView phát chain ngay khi vào bài (vẫn trong user gesture của nút Start)
      setExamAutoPlay(true);
      setPage('exam');
    }
  };

  const handleStartBundle = async (bundleId: string) => {
    // Ưu tiên tìm trong danh sách bộ đã nạp; nếu không có (VD bộ ẩn được giao cho lớp)
    // thì tải trực tiếp qua RLS — student trong lớp được giao có quyền đọc.
    let bundle = bundles.find(b => b.id === bundleId);
    if (!bundle) {
      try {
        bundle = (await fetchExamBundleById(bundleId)) || undefined;
      } catch (err) {
        console.error('Failed to fetch assigned bundle:', err);
      }
    }
    if (bundle) {
      setSelectedBundle(bundle);
      setBundleResults([]);
      setSelectedExam(null);
      setWritingAnswers({});
      setWritingSubmitted(false);
      setGuestSpeakingAudios([]);
      setPage('bundle');
    }
  };

  /** Guest kết thúc bộ: tạo session (1 passcode) + gắn toàn bộ leads của các kỹ năng đã thi */
  const handleBundleFinish = async (info: { fullName: string; phone: string; email: string }) => {
    if (!selectedBundle) return;
    const newPasscode = generatePasscode();
    const session: GuestSession = await createGuestSession({
      full_name: info.fullName,
      phone: info.phone,
      email: info.email,
      passcode: newPasscode,
      bundle_id: selectedBundle.id,
    });
    for (const r of bundleResults) {
      await submitGuestResult({
        exam_id: r.examId,
        exam_title: r.examTitle,
        skill_type: r.skillType,
        full_name: info.fullName,
        phone: info.phone,
        email: info.email,
        passcode: newPasscode,
        session_id: session.id,
        score_raw: r.correctCount,
        score_vstep: r.score,
        total_questions: r.totalCount,
        time_spent_seconds: r.timeTaken,
        user_answers: r.userAnswers,
        writing_answers: r.writingAnswers,
        speaking_audio: r.speakingAudios,
      });
    }
    // Kết thúc bộ → thoát strict mode (nếu có)
    strictMode.stop();
  };

  const handleBackToDashboard = () => {
    strictMode.stop();
    setSelectedExam(null);
    setPage('dashboard');
  };

  const handleReset = () => {
    strictMode.stop();
    examState.resetExam();
    resetTimer();
    setSelectedExam(null);
    setWritingAnswers({});
    setWritingSubmitted(false);
    setGuestSpeakingAudios([]);
    setSelectedBundle(null);
    setBundleResults([]);
    setPage('dashboard');
  };

  const handleWritingSubmit = () => {
    setWritingSubmitted(true);
  };

  const handleQuestionClick = (questionId: number) => {
    examState.goToQuestion(questionId);
    setTimeout(() => document.getElementById(`question-${questionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleAdminDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this exam set?')) {
      try {
        await deleteExam(id);
        loadExams();
      } catch (err) {
        console.error('Failed to delete exam:', err);
      }
    }
  };

  const handleAdminSave = async (exam: VstepExamSet) => {
    try {
      await upsertExam(exam, user?.id);
      setEditingExam(null);
      loadExams();
    } catch (err) {
      console.error('Failed to save exam:', err);
    }
  };

  const skillType = selectedExam?.skillType || 'reading';
  const [mobileReadingTab, setMobileReadingTab] = useState<'passage' | 'questions'>('passage');
  const answeredCount = Object.values(examState.userAnswers).filter(a => a !== null && a !== undefined).length;
  // Đã nộp xong kỹ năng đang thi (bundle) — dùng để chặn Back khi chưa nộp ở chế độ nghiêm ngặt
  const bundleDone = skillType === 'writing' ? writingSubmitted : examState.isCompleted;

  // Bundle (guest/student): khi nộp xong 1 kỹ năng → ghi nhận kết quả & quay về màn bộ
  useEffect(() => {
    if (!(selectedBundle && selectedExam)) return;
    const guestDone = skillType === 'writing' ? writingSubmitted : examState.isCompleted;
    if (!guestDone) return;

    const hasAutoScore = skillType !== 'writing' && skillType !== 'speaking';
    const results = hasAutoScore ? examState.calculateResults() : null;
    const skillResult: BundleSkillResult = {
      examId: selectedExam.id,
      examTitle: selectedExam.examTitle,
      skillType,
      score: results ? results.vstepScore : null,
      correctCount: results ? results.correctCount : null,
      totalCount: results ? results.totalCount : null,
      timeTaken: results ? results.timeTaken : null,
      userAnswers: Object.keys(examState.userAnswers).length > 0 ? { ...examState.userAnswers } : null,
      writingAnswers: writingAnswers && Object.keys(writingAnswers).length > 0 ? { ...writingAnswers } : null,
      speakingAudios: guestSpeakingAudios.length > 0 ? [...guestSpeakingAudios] : null,
      submittedAt: Date.now(),
    };
    // Nếu skill này đã nộp trước đó (làm lại) → thay kết quả mới, không thêm trùng
    setBundleResults(prev => {
      const idx = prev.findIndex(r => r.examId === selectedExam.id);
      if (idx === -1) return [...prev, skillResult];
      const next = [...prev];
      next[idx] = skillResult;
      return next;
    });
    // Reset trạng thái đề để quay về màn chọn kỹ năng của bộ
    examState.resetExam();
    resetTimer();
    setWritingAnswers({});
    setWritingSubmitted(false);
    setGuestSpeakingAudios([]);
    setConfirmModalOpen(false);
    setSelectedExam(null);
    setPage('bundle');
  }, [selectedBundle, selectedExam, skillType, writingSubmitted, examState.isCompleted, bundleResults, examState, writingAnswers, guestSpeakingAudios, resetTimer]);

  // Số thứ tự câu hỏi bắt đầu của passage tại index — để QuestionList đánh số liên tục khớp QuestionMap
  const passageStartNumber = (index: number) =>
    (selectedExam?.passages.slice(0, index).reduce((sum, p) => sum + p.questions.length, 0)) || 0;

  // Overlay cảnh báo vi phạm strict mode (anti-cheat)
  const strictWarningOverlay = strictMode.warning ? (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border-2 border-rose-300 dark:border-rose-800">
        <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield size={24} className="text-rose-600 dark:text-rose-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Cảnh báo vi phạm chế độ thi</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{strictMode.warning}</p>
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-4">
          Lần vi phạm {Math.min(strictMode.violations, strictMode.maxViolations)}/{strictMode.maxViolations} — đủ {strictMode.maxViolations} lần sẽ tự động nộp bài.
        </p>
        <button
          onClick={() => strictMode.setWarning(null)}
          className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
        >
          Tôi đã hiểu, tiếp tục
        </button>
      </div>
    </div>
  ) : null;

  // Loading auth
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-indigo-600" />
          <p className="text-indigo-900 dark:text-gray-100 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="relative h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="logo-pattern" style={{ backgroundImage: `url(${logoBg})` }} />
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-12 max-w-md w-full text-center">
          <Shield size={48} className="mx-auto text-indigo-600 mb-4" />
          <h1 className="text-3xl font-bold text-indigo-900 dark:text-gray-100 mb-2">E-Master Online Exam Center</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Sign in to start practicing</p>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all"
          >
            Sign In
          </button>
          <button
            onClick={handleGuestLogin}
            className="mt-3 w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all"
          >
            Login as Guest
          </button>
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
            No self-registration. Contact the administrator to create your account.
          </p>
        </div>
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} onAuthSuccess={handleAuthSuccess} onGuestLogin={handleGuestLogin} />
      </div>
    );
  }

  // Profile page (must come before admin/teacher view check)
  if (page === 'profile' && userRole !== 'guest') {
    if (isTeacherView || userRole === 'teacher') {
      return (
        <TeacherProfile
          user={user}
          onBack={() => { setPage('dashboard'); }}
          onLogout={handleLogout}
          isDark={isDark}
          toggleDarkMode={toggleDarkMode}
        />
      );
    }
    return (
      <StudentProfile
        user={user}
        onBack={() => setPage('dashboard')}
        onViewHistory={() => setPage('history')}
        onLogout={handleLogout}
        isDark={isDark}
        toggleDarkMode={toggleDarkMode}
      />
    );
  }

  // Admin / Teacher view
  if (isAdmin || isTeacherView) {
    const viewMode = isTeacherView ? 'teacher' : 'admin';

    // Teacher grading view (full page, outside admin layout)
    if (adminTab === 'grading' && isTeacherView) {
      return (
        <WritingGrading
          user={user}
          userId={user?.id || ''}
          onBack={() => setAdminTab('exams')}
        />
      );
    }

    // Speaking grading view (full page, outside admin layout)
    if (adminTab === 'speaking_grading' && isTeacherView) {
      return (
        <SpeakingGrading
          user={user}
          userId={user?.id || ''}
          userRole={userRole}
          onBack={() => setAdminTab('exams')}
        />
      );
    }

    return (
      <AdminLayout
        viewMode={viewMode}
        onBackToStudent={isTeacherView ? undefined : () => setIsAdmin(false)}
        user={user}
        userRole={userRole}
        onLogout={handleLogout}
        activeTab={adminTab}
        onTabChange={(tab) => { if (tab !== 'profile') setAdminTab(tab); }}
        onViewProfile={() => setPage('profile')}
      >
        {adminTab === 'exams' ? (
          editingExam ? (
            <ExamForm initialExam={editingExam} onSave={handleAdminSave} onCancel={() => setEditingExam(null)} />
          ) : (
            <>
              <ExamList exams={exams} onEdit={setEditingExam} onPreview={setPreviewingExam} onDelete={handleAdminDelete} onRefresh={loadExams} />
              {previewingExam && <ExamPreview exam={previewingExam} onClose={() => setPreviewingExam(null)} />}
            </>
          )
        ) : adminTab === 'classes' && !isTeacherView ? (
          <AdminClasses userId={user?.id || ''} />
        ) : adminTab === 'students' ? (
          <AdminStudents onBack={() => setAdminTab('exams')} teacherId={isTeacherView ? user?.id : undefined} />
        ) : adminTab === 'overview' && !isTeacherView ? (
          <AdminOverview onNavigate={(tab) => setAdminTab(tab as any)} />
        ) : adminTab === 'teachers' && !isTeacherView ? (
          <AdminTeachers onNavigate={(tab) => setAdminTab(tab as any)} />
        ) : adminTab === 'guest_grading' ? (
          <AdminGuestGrading userId={user?.id || ''} viewMode={isTeacherView ? 'teacher' : 'admin'} />
        ) : adminTab === 'bundles' ? (
          <AdminBundles viewMode={isTeacherView ? 'teacher' : 'admin'} />
        ) : adminTab === 'database' && !isTeacherView ? (
          <AdminDatabase />
        ) : null}
      </AdminLayout>
    );
  }

  // Exam History page
  if (page === 'history' && userRole !== 'guest') {
    return <ExamHistory userId={user.id} onBack={handleBackToDashboard} />;
  }

  // Màn hình thi thử theo bộ (guest/student: chọn kỹ năng → thi → kết thúc)
  if (page === 'bundle' && selectedBundle) {
    return (
      <>
        <GuestBundleView
          bundle={selectedBundle}
          exams={exams}
          results={bundleResults}
          isGuest={userRole === 'guest'}
          onStartSkill={handleStartExam}
          onFinish={handleBundleFinish}
          onBack={() => { strictMode.stop(); setSelectedBundle(null); setBundleResults([]); setPage('dashboard'); }}
          onHome={() => { strictMode.stop(); setSelectedBundle(null); setBundleResults([]); setPage('dashboard'); }}
        />
        {strictWarningOverlay}
      </>
    );
  }

  // Đang thi theo bộ (guest/student): vừa nộp xong 1 kỹ năng → effect ghi nhận & quay về màn bộ
  if (page === 'exam' && selectedExam && selectedBundle) {
    if (bundleDone) {
      return (
        <div className="h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
          <Loader2 size={40} className="animate-spin text-indigo-600" />
        </div>
      );
    }
  }

  // Guest: hoàn thành bài → không hiện điểm ngay, để lại thông tin nhận kết quả
  if (userRole === 'guest' && page === 'exam' && selectedExam) {
    const guestDone = skillType === 'writing'
      ? writingSubmitted
      : examState.isCompleted;
    if (guestDone) {
      const hasAutoScore = skillType !== 'writing' && skillType !== 'speaking';
      const results = hasAutoScore ? examState.calculateResults() : null;
      return (
        <GuestResultView
          exam={selectedExam}
          result={results ? {
            correctCount: results.correctCount,
            totalCount: results.totalCount,
            vstepScore: results.vstepScore,
            timeTaken: results.timeTaken,
          } : null}
          userAnswers={examState.userAnswers}
          writingAnswers={writingAnswers}
          speakingAudios={guestSpeakingAudios}
          onDone={handleReset}
        />
      );
    }
  }

  // Guest: mở trang tra cứu kết quả (sdt + passcode)
  if (userRole === 'guest' && guestLookupOpen) {
    return (
      <GuestResultLookup
        onBack={() => setGuestLookupOpen(false)}
        onHome={() => { setGuestLookupOpen(false); handleBackToDashboard(); }}
      />
    );
  }

  // Writing completed
  if (page === 'exam' && skillType === 'writing' && writingSubmitted && selectedExam) {
    return (
      <WritingResultView
        tasks={selectedExam.writingTasks || []}
        writingAnswers={writingAnswers}
        timeTaken={(selectedExam.totalDurationMinutes * 60) - (minutes * 60 + seconds)}
        onReset={handleReset}
      />
    );
  }

  // Speaking completed
  if (page === 'exam' && skillType === 'speaking' && examState.isCompleted && selectedExam) {
    return (
      <SpeakingResultView
        passages={selectedExam.passages}
        timeTaken={(selectedExam.totalDurationMinutes * 60) - (minutes * 60 + seconds)}
        onReset={handleReset}
      />
    );
  }

  // Reading/Listening results
  if (page === 'exam' && examState.isCompleted && selectedExam && skillType !== 'writing' && skillType !== 'speaking') {
    const results = examState.calculateResults();
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="flex justify-end p-4">
          <button onClick={handleReset} className="text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 underline text-sm">Back to Dashboard</button>
        </div>
        <ResultView
          correctCount={results.correctCount}
          totalCount={results.totalCount}
          percentage={results.percentage}
          vstepScore={results.vstepScore}
          timeTaken={results.timeTaken}
          results={results.results}
          passages={selectedExam.passages}
          onReset={handleReset}
          bookmarkedQuestions={examState.bookmarkedQuestions}
        />
      </div>
    );
  }

  // Exam view
  if (page === 'exam' && selectedExam) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
        <ExamHeader
          examTitle={selectedExam.examTitle}
          skillType={skillType}
          minutes={minutes}
          seconds={seconds}
          currentPassageIndex={examState.currentPassageIndex}
          totalPassages={selectedExam.passages.length}
          onSelectPassage={examState.selectPassage}
          onSubmitClick={() => setConfirmModalOpen(true)}
          onBackToDashboard={handleBackToDashboard}
          disableBack={!!(selectedBundle?.strict_mode && !bundleDone)}
          bookmarkedCount={examState.getBookmarkedCount()}
        />

        {/* READING: split screen */}
        {skillType === 'reading' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Mobile tab bar for reading */}
            <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden flex bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl">
              <button
                onClick={() => setMobileReadingTab('passage')}
                className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
                  mobileReadingTab === 'passage'
                    ? 'text-indigo-700 bg-indigo-50 border-t-2 border-indigo-600'
                    : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600'
                }`}
              >
                Passage
              </button>
              <button
                onClick={() => setMobileReadingTab('questions')}
                className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
                  mobileReadingTab === 'questions'
                    ? 'text-indigo-700 bg-indigo-50 border-t-2 border-indigo-600'
                    : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600'
                }`}
              >
                Questions {answeredCount > 0 && `(${answeredCount})`}
              </button>
            </div>
            {/* Passage panel */}
            <div className={`w-full md:w-1/2 ${mobileReadingTab === 'questions' ? 'hidden md:block' : ''}`}>
              <PassageView
                title={selectedExam.passages[examState.currentPassageIndex]?.title || ''}
                passageText={selectedExam.passages[examState.currentPassageIndex]?.passageText || ''}
                passageId={selectedExam.passages[examState.currentPassageIndex]?.id || 0}
                highlights={highlighter.highlights}
                isHighlightMode={highlighter.isHighlightMode}
                activeColor={highlighter.activeColor}
                onToggleHighlightMode={highlighter.toggleHighlightMode}
                onSetActiveColor={highlighter.setActiveColor}
                onAddHighlight={highlighter.addHighlight}
                onRemoveHighlight={highlighter.removeHighlight}
                onClearHighlights={highlighter.clearPassageHighlights}
                showTimerToggle={true}
                onToggleTimer={() => setShowPassageTimer(!showPassageTimer)}
                timerSlot={showPassageTimer ? (
                  <div className="px-4 md:px-8 pb-4 border-b border-gray-100">
                    <PassageTimer
                      totalMinutes={selectedExam.totalDurationMinutes}
                      passageCount={selectedExam.passages.length}
                      currentPassageIndex={examState.currentPassageIndex}
                      passageTimes={passageTimes}
                      lockedPassages={lockedPassages}
                      onPassageTimeChange={(index, newMinutes) => {
                        setPassageTimes(prev => {
                          const next = [...prev];
                          next[index] = newMinutes;
                          return next;
                        });
                      }}
                      onToggleLock={(index) => {
                        setLockedPassages(prev => {
                          const next = [...prev];
                          next[index] = !next[index];
                          return next;
                        });
                      }}
                    />
                  </div>
                ) : undefined}
              />
            </div>
            {/* Questions panel */}
            <div className={`w-full md:w-1/2 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 ${mobileReadingTab === 'passage' ? 'hidden md:flex' : ''}`}>
              <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
                <div className="max-w-2xl mx-auto">
                  <QuestionMap
                    passages={selectedExam.passages}
                    userAnswers={examState.userAnswers}
                    currentPassageIndex={examState.currentPassageIndex}
                    onQuestionClick={handleQuestionClick}
                    bookmarkedQuestions={examState.bookmarkedQuestions}
                    onToggleBookmark={examState.toggleBookmark}
                  />
                  <QuestionList
                    questions={selectedExam.passages[examState.currentPassageIndex]?.questions || []}
                    userAnswers={examState.userAnswers}
                    onAnswer={examState.answerQuestion}
                    onToggleBookmark={examState.toggleBookmark}
                    isBookmarked={examState.isBookmarked}
                    startNumber={passageStartNumber(examState.currentPassageIndex)}
                  />
                  <div className="h-20" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LISTENING: single scrollable column */}
        {skillType === 'listening' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            <div className="w-full md:w-1/2 bg-white dark:bg-gray-800">
              <ListeningView
                key={selectedExam.id}
                passages={selectedExam.passages}
                currentPassageIndex={examState.currentPassageIndex}
                canPlayIndividual={isAdmin || isTeacherView || userRole === 'teacher'}
                autoPlay={examAutoPlay}
              />
            </div>
            <div className="w-full md:w-1/2 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
              <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-2xl mx-auto">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-700 rounded-2xl shadow-xl p-4 md:p-6 mb-6 text-white">
                    <Headphones size={24} className="mb-2 hidden md:block" />
                    <Headphones size={20} className="mb-1 md:hidden" />
                    <h3 className="font-bold text-base md:text-lg">Listening Tips</h3>
                    <p className="text-purple-200 text-xs md:text-sm mt-1">
                      Listen carefully. Each audio can only be played once.
                    </p>
                  </div>
                  <QuestionMap
                    passages={selectedExam.passages}
                    userAnswers={examState.userAnswers}
                    currentPassageIndex={examState.currentPassageIndex}
                    onQuestionClick={(id) => {
                      handleQuestionClick(id);
                      document.getElementById(`listening-q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    bookmarkedQuestions={examState.bookmarkedQuestions}
                    onToggleBookmark={examState.toggleBookmark}
                  />
                  <QuestionList
                    questions={selectedExam.passages[examState.currentPassageIndex]?.questions || []}
                    userAnswers={examState.userAnswers}
                    onAnswer={examState.answerQuestion}
                    onToggleBookmark={examState.toggleBookmark}
                    isBookmarked={examState.isBookmarked}
                    prefix="listening-q-"
                    startNumber={passageStartNumber(examState.currentPassageIndex)}
                  />
                  <div className="h-20" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WRITING: full screen */}
        {skillType === 'writing' && (
          <WritingView
            tasks={selectedExam.writingTasks || []}
            writingAnswers={writingAnswers}
            onWritingChange={(taskId, text) => {
              setWritingAnswers(prev => ({ ...prev, [taskId]: text }));
            }}
            userId={user?.id}
            examId={selectedExam.id}
            onWritingSubmit={() => setWritingSubmitted(true)}
          />
        )}

        {/* SPEAKING: full screen */}
        {skillType === 'speaking' && (
          <SpeakingView
            passages={selectedExam.passages}
            examTitle={selectedExam.examTitle}
            examDescription={selectedExam.description}
            userId={user?.id}
            examId={selectedExam.id}
            onSpeakingSubmit={() => examState.submitExam()}
            onGuestAudioUploaded={(passageNumber, passageTitle, audioUrl, durationSeconds) => {
              setGuestSpeakingAudios(prev => [
                ...prev,
                { passage_number: passageNumber, passage_title: passageTitle, audio_url: audioUrl, duration_seconds: durationSeconds },
              ]);
            }}
          />
        )}

        <ConfirmSubmitModal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onConfirm={() => {
            setConfirmModalOpen(false);
            if (skillType === 'writing') {
              handleWritingSubmit();
            } else {
              examState.submitExam();
            }
          }}
          submitting={examState.submitting}
        />

        {strictWarningOverlay}
      </div>
    );
  }

  // Dashboard (default for logged-in students)
  if (examsLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <StudentDashboard
      user={user}
      userRole={userRole}
      exams={exams}
      bundles={bundles}
      onStartBundle={handleStartBundle}
      onStartExam={handleStartExam}
      onViewHistory={() => setPage('history')}
      onViewProfile={() => setPage('profile')}
      onLogout={handleLogout}
      onSwitchToAdmin={() => setIsAdmin(true)}
      onLookupResult={() => setGuestLookupOpen(true)}
      isDark={isDark}
      toggleDarkMode={toggleDarkMode}
    />
  );
}

export default App;
