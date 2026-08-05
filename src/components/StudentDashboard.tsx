import React, { useEffect, useState } from 'react';
import { VstepExamSet } from '../data/vstepReadingMock';
import { fetchUserExamResults, fetchStudentAssignments, Assignment } from '../lib/supabaseService';
import { FileText, Clock, BarChart3, History, LogOut, User, Shield, Trophy, Loader2, Headphones, BookOpen, BookMarked, Calendar, Bell, BellRing, Moon, Sun, Mic, AlertTriangle } from 'lucide-react';
interface StudentDashboardProps {
  user: any;
  userRole: string | null;
  exams: VstepExamSet[];
  onStartExam: (examId: string) => void;
  onViewHistory: () => void;
  onViewProfile: () => void;
  onLogout: () => void;
  onSwitchToAdmin: () => void;
  isDark: boolean;
  toggleDarkMode: () => void;
}

type SkillFilter = 'all' | 'reading' | 'listening' | 'writing' | 'speaking';

const skillConfig = {
  reading: { icon: BookOpen, label: 'Reading', color: 'from-indigo-500 to-indigo-700', bg: 'bg-indigo-100 text-indigo-700' },
  listening: { icon: Headphones, label: 'Listening', color: 'from-purple-500 to-purple-700', bg: 'bg-purple-100 text-purple-700' },
  writing: { icon: BookMarked, label: 'Writing', color: 'from-emerald-500 to-emerald-700', bg: 'bg-emerald-100 text-emerald-700' },
  speaking: { icon: Mic, label: 'Speaking', color: 'from-rose-500 to-rose-700', bg: 'bg-rose-100 text-rose-700' },
};

/** Show average score per skill type and highlight weakest area */
function PerformanceBySkill({ results, exams }: { results: any[]; exams: VstepExamSet[] }) {
  const examTypeMap = new Map(exams.map(e => [e.id, e.skillType]));

  // Group results by skill type
  const byType: Record<string, { total: number; count: number; lastScore: number }> = {};
  results.forEach((r: any) => {
    const skill = examTypeMap.get(r.exam_id) || 'reading';
    if (!byType[skill]) byType[skill] = { total: 0, count: 0, lastScore: 0 };
    byType[skill].total += r.score_vstep ?? 0;
    byType[skill].count++;
    byType[skill].lastScore = r.score_vstep ?? 0;
  });

  // Find weakest
  let weakest = '';
  let weakestAvg = 11;
  const stats = Object.entries(byType).map(([skill, data]) => {
    const avg = Math.round((data.total / data.count) * 10) / 10;
    if (avg < weakestAvg) { weakestAvg = avg; weakest = skill; }
    const cfg = skillConfig[skill as keyof typeof skillConfig];
    return { skill, label: cfg.label, avg, count: data.count, icon: cfg.icon, color: cfg.color, bg: cfg.bg };
  });

  stats.sort((a, b) => a.avg - b.avg);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 p-6 mb-6">
      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <BarChart3 size={18} className="text-indigo-500" />
        Performance by Skill
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          const isWeakest = s.skill === weakest && stats.length > 1;
          return (
            <div key={s.skill} className={`relative p-4 rounded-xl border-2 transition-all ${
              isWeakest
                ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10'
                : 'border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30'
            }`}>
              {isWeakest && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <AlertTriangle size={12} className="text-white" />
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} className={isWeakest ? 'text-red-500' : 'text-gray-400'} />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{s.label}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.avg.toFixed(1)}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{s.count} exam{s.count > 1 ? 's' : ''}</div>
              {isWeakest && (
                <div className="mt-2 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded px-1.5 py-0.5 inline-block">
                  Needs Focus
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  userRole,
  exams,
  onStartExam,
  onViewHistory,
  onViewProfile,
  onLogout,
  onSwitchToAdmin,
  isDark,
  toggleDarkMode,
}) => {
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [skillFilter, setSkillFilter] = useState<SkillFilter>('all');
  const [assignments, setAssignments] = useState<(Assignment & { class_name?: string })[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

  interface NotificationItem {
    id: string;
    type: 'deadline_soon' | 'deadline_today' | 'new_assignment';
    title: string;
    message: string;
    examId: string;
    createdAt: number;
  }

  // Compute notifications from assignments data
  const notifications: NotificationItem[] = React.useMemo(() => {
    const now = new Date();
    const result: NotificationItem[] = [];

    assignments.forEach(a => {
      const deadline = new Date(a.deadline);
      const diffMs = deadline.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      const createdSinceDays = (now.getTime() - new Date(a.created_at || a.deadline).getTime()) / (1000 * 60 * 60 * 24);

      // Deadline within 24 hours (today)
      if (diffHours > 0 && diffHours <= 24) {
        result.push({
          id: `due-today-${a.id}`,
          type: 'deadline_today',
          title: 'Due Today',
          message: `"${a.title}" deadline is today! ${deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          examId: a.exam_id,
          createdAt: now.getTime(),
        });
      }
      // Deadline within 2 days
      else if (diffDays > 0 && diffDays <= 2) {
        result.push({
          id: `due-soon-${a.id}`,
          type: 'deadline_soon',
          title: 'Deadline Approaching',
          message: `"${a.title}" due in ${Math.ceil(diffDays)} day${Math.ceil(diffDays) > 1 ? 's' : ''}`,
          examId: a.exam_id,
          createdAt: now.getTime(),
        });
      }

      // New assignment (created within last 3 days)
      if (createdSinceDays >= 0 && createdSinceDays <= 3) {
        result.push({
          id: `new-${a.id}`,
          type: 'new_assignment',
          title: 'New Assignment',
          message: `"${a.title}" has been assigned${a.class_name ? ` in ${a.class_name}` : ''}`,
          examId: a.exam_id,
          createdAt: new Date(a.created_at || a.deadline).getTime(),
        });
      }
    });

    // Sort by most recent
    result.sort((a, b) => b.createdAt - a.createdAt);
    return result;
  }, [assignments]);

  const unreadCount = notifications.filter(n => !readNotificationIds.has(n.id)).length;

  const handleNotificationClick = (n: NotificationItem) => {
    setReadNotificationIds(prev => new Set(prev).add(n.id));
    setShowNotifications(false);
    onStartExam(n.examId);
  };

  useEffect(() => {
    const loadResults = async () => {
      try {
        const data = await fetchUserExamResults(user.id);
        setRecentResults(data?.slice(0, 5) || []);
      } catch (err) {
        console.error('Failed to load results:', err);
      } finally {
        setLoadingResults(false);
      }
    };
    loadResults();
  }, [user.id]);

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const data = await fetchStudentAssignments(user.id);
        setAssignments(data || []);
      } catch (err) {
        console.error('Failed to load assignments:', err);
      } finally {
        setAssignmentsLoading(false);
      }
    };
    loadAssignments();
  }, [user.id]);

  // Build a map from exam_id -> assignment for quick lookup
  const assignmentMap = new Map<string, Assignment & { class_name?: string }>();
  assignments.forEach(a => {
    if (!assignmentMap.has(a.exam_id)) {
      assignmentMap.set(a.exam_id, a);
    }
  });

  // Exams that match the student's assignments
  const assignedExamIds = new Set(assignments.map(a => a.exam_id));
  const assignedExams = exams.filter(e => assignedExamIds.has(e.id));

  // Filter by skill, and by assignment if user is logged in
  const skillFiltered = skillFilter === 'all' ? exams : exams.filter(e => e.skillType === skillFilter);
  const filteredExams = user
    ? skillFiltered.filter(e => assignedExamIds.has(e.id))
    : skillFiltered;

  const hasNoClasses = user && !assignmentsLoading && assignments.length === 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const bestScore = recentResults.length > 0
    ? Math.max(...recentResults.map((r: any) => r.score_vstep))
    : null;

  const getExamIcon = (type: string) => {
    const config = skillConfig[type as keyof typeof skillConfig];
    const Icon = config?.icon || FileText;
    return Icon;
  };

  const getDeadlineBadge = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (deadlineDate < now) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
          <Calendar size={12} /> Expired
        </span>
      );
    }
    if (diffDays <= 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
          <Calendar size={12} /> Due soon
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        <Calendar size={12} /> {Math.ceil(diffDays)}d left
      </span>
    );
  };

  const formatDeadline = (deadline: string) => {
    const d = new Date(deadline);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-900 to-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <Trophy size={22} className="md:size-[28px] text-yellow-400" />
            <h1 className="text-lg md:text-2xl font-bold">E-Master</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:flex items-center gap-2 text-indigo-200 text-sm">
              <User size={16} />
              <span>{user.email}</span>
              {userRole === 'admin' && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-full">Admin</span>
              )}
            </div>
            {userRole === 'admin' && (
              <button onClick={onSwitchToAdmin} className="flex items-center gap-1 text-indigo-200 hover:text-white text-xs md:text-sm transition-colors" title="Admin">
                <Shield size={16} />
                <span className="hidden md:inline">Admin</span>
              </button>
            )}
            {/* Notification Bell */}
            {!assignmentsLoading && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative flex items-center gap-1 text-indigo-200 hover:text-white text-xs md:text-sm transition-colors"
                  title="Notifications"
                >
                  {unreadCount > 0 ? <BellRing size={16} className="text-amber-300 animate-pulse" /> : <Bell size={16} />}
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 shadow-md">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                {/* Dropdown */}
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[70vh] flex flex-col">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setReadNotificationIds(new Set(notifications.map(n => n.id))); }}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                            <Bell size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                            <p>No notifications</p>
                            <p className="text-xs mt-1">You're all caught up!</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-50 dark:divide-gray-700">
                            {notifications.map(n => {
                              const isRead = readNotificationIds.has(n.id);
                              const typeStyles = {
                                deadline_today: 'bg-red-50 border-red-200',
                                deadline_soon: 'bg-amber-50 border-amber-200',
                                new_assignment: 'bg-blue-50 border-blue-200',
                              };
                              const typeIcons = {
                                deadline_today: '🔴',
                                deadline_soon: '🟡',
                                new_assignment: '🆕',
                              };
                              return (
                                <button
                                  key={n.id}
                                  onClick={() => handleNotificationClick(n)}
                                  className={`w-full text-left p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-start gap-3 border-l-4 ${typeStyles[n.type]} ${isRead ? 'opacity-70' : ''}`}
                                >
                                  <div className="flex-shrink-0 mt-0.5 text-sm">{typeIcons[n.type]}</div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-xs font-bold mb-0.5 ${isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                      {n.title}
                                    </div>
                                    <p className={`text-xs leading-relaxed ${isRead ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>
                                      {n.message}
                                    </p>
                                  </div>
                                  {!isRead && <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            <button onClick={() => {
              const root = document.documentElement;
              const isDarkMode = root.classList.contains('dark');
              if (isDarkMode) {
                root.classList.remove('dark');
                root.style.colorScheme = 'light';
                localStorage.setItem('vstep-dark-mode', 'light');
              } else {
                root.classList.add('dark');
                root.style.colorScheme = 'dark';
                localStorage.setItem('vstep-dark-mode', 'dark');
              }
              // Force React re-render via props
              toggleDarkMode();
            }} className="flex items-center gap-1 text-indigo-200 hover:text-white text-xs md:text-sm transition-colors" title={isDark ? 'Light Mode' : 'Dark Mode'}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={onViewProfile} className="flex items-center gap-1 text-indigo-200 hover:text-white text-xs md:text-sm transition-colors" title="Profile">
              <User size={16} />
              <span className="hidden md:inline">Profile</span>
            </button>
            <button onClick={onLogout} className="flex items-center gap-1 text-indigo-200 hover:text-white text-xs md:text-sm transition-colors" title="Logout">
              <LogOut size={16} />
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-8">
        {/* Welcome + Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 p-6 md:p-8">
            <h2 className="text-2xl font-bold text-indigo-900 dark:text-gray-100 mb-2">
              Welcome back!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {recentResults.length > 0
                ? `You've completed ${recentResults.length} test${recentResults.length > 1 ? 's' : ''}. Keep practicing to improve your score!`
                : 'Ready to practice? Start a new test below.'}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 p-6 text-center">
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">
              {assignmentsLoading ? '...' : assignedExams.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
              <FileText size={14} /> Available Tests
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 p-6 text-center">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-1">
              {loadingResults ? '...' : bestScore !== null ? bestScore.toFixed(1) : '-'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
              <BarChart3 size={14} /> Best Score
            </div>
          </div>
        </div>

        {/* Weakness Analysis */}
        {recentResults.length >= 2 && (
          <PerformanceBySkill results={recentResults} exams={exams} />
        )}

        {/* Skill Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {(['all', 'reading', 'listening', 'writing', 'speaking'] as SkillFilter[]).map((filter) => {
            const isActive = skillFilter === filter;
            const countForFilter = filter === 'all'
              ? (user ? assignedExams.length : exams.length)
              : (user ? assignedExams.filter(e => e.skillType === filter).length : exams.filter(e => e.skillType === filter).length);
            return (
              <button
                key={filter}
                onClick={() => setSkillFilter(filter)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:text-indigo-700 shadow-sm'
                }`}
              >
                {filter !== 'all' && React.createElement(skillConfig[filter].icon, { size: 16 })}
                {filter === 'all' ? 'All Skills' : skillConfig[filter].label}
                {isActive && (
                  <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded">
                    {countForFilter}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          {/* Available Exams */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {assignmentsLoading ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 p-8 flex justify-center">
                  <Loader2 size={24} className="animate-spin text-indigo-600" />
                </div>
              ) : hasNoClasses ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 p-8 text-center">
                  <div className="text-4xl mb-4">📚</div>
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">You are not enrolled in any class yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Ask your teacher to add you.</p>
                </div>
              ) : filteredExams.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 p-8 text-center text-gray-500 dark:text-gray-400">
                  No exams available for this skill.
                </div>
              ) : (
                filteredExams.map(exam => {
                  const Icon = getExamIcon(exam.skillType);
                  const config = skillConfig[exam.skillType];
                  const assignment = assignmentMap.get(exam.id);
                  return (
                    <div key={exam.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 p-4 md:p-6 hover:shadow-xl dark:hover:shadow-gray-900/50 transition-shadow">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 md:gap-3 mb-2">
                            <div className={`p-1.5 md:p-2 rounded-lg ${config.bg}`}>
                              <Icon size={16} className="md:size-[18px]" />
                            </div>
                            <h4 className="text-base md:text-lg font-bold text-indigo-900 dark:text-gray-100 truncate">{exam.examTitle}</h4>
                          </div>
                          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{exam.description}</p>
                          <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                            <span className="flex items-center gap-1"><Clock size={12} className="md:size-[14px]" /> {exam.totalDurationMinutes} mins</span>
                            {exam.skillType !== 'writing' && (
                              <span className="flex items-center gap-1"><FileText size={12} className="md:size-[14px]" /> {exam.passages.length} part{exam.passages.length > 1 ? 's' : ''}</span>
                            )}
                            {exam.writingTasks && (
                              <span className="flex items-center gap-1"><FileText size={12} className="md:size-[14px]" /> {exam.writingTasks.length} task{exam.writingTasks.length > 1 ? 's' : ''}</span>
                            )}
                            <span className="flex items-center gap-1"><BarChart3 size={12} className="md:size-[14px]" /> {exam.totalQuestions} questions</span>
                          </div>
                          {assignment && (
                            <div className="mt-2 md:mt-3 flex items-center gap-2 md:gap-3 flex-wrap">
                              {getDeadlineBadge(assignment.deadline)}
                              <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                <Calendar size={12} /> Deadline: {formatDeadline(assignment.deadline)}
                              </span>
                              {assignment.class_name && (
                                <span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-full font-medium">
                                  {assignment.class_name}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => onStartExam(exam.id)}
                          className={`md:ml-6 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r ${config.color} text-white rounded-lg font-semibold hover:shadow-lg transition-all shadow-md hover:scale-105 flex-shrink-0 text-sm md:text-base min-h-[44px]`}
                        >
                          Start {config.label}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Results */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-indigo-900 dark:text-gray-100 flex items-center gap-2">
              <History size={22} /> Recent Results
            </h3>
            {recentResults.length > 0 && (
              <button onClick={onViewHistory} className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium">
                View All
              </button>
            )}
          </div>
          <div className="space-y-3">
            {loadingResults ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 p-8 flex justify-center">
                <Loader2 size={24} className="animate-spin text-indigo-600" />
              </div>
            ) : recentResults.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 p-8 text-center text-gray-500 dark:text-gray-400">
                <p className="text-sm">No tests taken yet.</p>
                <p className="text-xs mt-1">Start your first exam above!</p>
              </div>
            ) : (
              recentResults.map((r: any) => (
                <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl shadow dark:shadow-gray-900/30 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate mr-2">
                      {r.exams?.title || 'Practice Test'}
                    </span>
                    <span className={`text-sm font-bold ${
                      r.score_vstep >= 6.5 ? 'text-green-600' : r.score_vstep >= 5.0 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {r.score_vstep}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{r.score_raw}/{r.total_questions ?? '-'} correct</span>
                    <span>{formatTime(r.time_spent_seconds)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          </div>
        </div>
      </main>
    </div>
  );
};
