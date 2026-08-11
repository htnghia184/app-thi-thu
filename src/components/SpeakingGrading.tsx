import React, { useState, useEffect, useCallback } from 'react';
import { fetchSpeakingSubmissions } from '../lib/supabaseService';
import { SpeakingGradeDetail } from './SpeakingGradeDetail';
import {
  ArrowLeft, Search, Filter, Loader2, Clock, CheckCircle, AlertCircle,
  Headphones, User, Mic
} from 'lucide-react';

interface SpeakingGradingProps {
  user: any;
  userId: string;
  onBack: () => void;
  /** Role người đang xem — chỉ admin mới được tải audio về */
  userRole?: string | null;
}

type StatusFilter = 'all' | 'pending' | 'graded';

export const SpeakingGrading: React.FC<SpeakingGradingProps> = ({
  user,
  userId,
  onBack,
  userRole,
}) => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSpeakingSubmissions({
        teacherId: userId,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setSubmissions(data);
    } catch (err: any) {
      console.error('Failed to fetch speaking submissions:', err);
      setError(err.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, [userId, statusFilter]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const filteredSubmissions = submissions.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (s.user_name || '').toLowerCase().includes(term) ||
      (s.exam_title || '').toLowerCase().includes(term) ||
      (s.passage_title || '').toLowerCase().includes(term)
    );
  });

  const handleGraded = () => {
    setSelectedSubmission(null);
    loadSubmissions();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getStatusBadge = (submission: any) => {
    if (submission.grade) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
          <CheckCircle size={12} />
          Graded ({submission.grade.score}/10)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        <Clock size={12} />
        Pending
      </span>
    );
  };

  // Show detail view
  if (selectedSubmission) {
    return (
      <SpeakingGradeDetail
        submission={selectedSubmission}
        onBack={() => setSelectedSubmission(null)}
        onGraded={handleGraded}
        userRole={userRole}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-gradient-to-r from-rose-900 to-pink-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-white/70 hover:text-white transition-colors mr-2"
            >
              <ArrowLeft size={20} />
            </button>
            <Headphones size={28} className="text-rose-300" />
            <div>
              <h1 className="text-xl font-bold">Speaking Grading</h1>
              <p className="text-rose-200 text-sm">
                Review and grade student speaking submissions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-rose-200 text-sm">
            <User size={16} />
            <span>{user.email}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student name, exam, or passage..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 outline-none transition-all text-sm dark:bg-gray-700 dark:text-gray-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {(['all', 'pending', 'graded'] as StatusFilter[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      statusFilter === status
                        ? 'bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {status === 'all' ? 'All' : status === 'pending' ? 'Pending' : 'Graded'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow dark:shadow-gray-900/30 p-5 text-center">
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{submissions.length}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Submissions</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow dark:shadow-gray-900/30 p-5 text-center">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {submissions.filter((s) => !s.grade).length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Pending</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow dark:shadow-gray-900/30 p-5 text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {submissions.filter((s) => s.grade).length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Graded</div>
          </div>
        </div>

        {/* Submissions List */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-12 flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-rose-600" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Loading submissions...</p>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-12 text-center">
            <AlertCircle size={40} className="mx-auto text-red-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Error Loading Submissions</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{error}</p>
            <button
              onClick={loadSubmissions}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Retry
            </button>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-12 text-center">
            <Headphones size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {searchTerm ? 'No submissions match your search' : 'No speaking submissions yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {searchTerm
                ? 'Try a different search term or filter.'
                : 'Submissions will appear here once students complete speaking tasks.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map((submission) => (
              <button
                key={submission.id}
                onClick={() => setSelectedSubmission(submission)}
                className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-6 hover:shadow-xl transition-all hover:scale-[1.01] border-l-4 border-l-transparent hover:border-l-rose-500"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(submission.user_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {submission.user_name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{submission.exam_title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                        <Headphones size={12} />
                        {submission.passage_title || `Part ${submission.passage_id}`}
                      </span>
                      {submission.duration_seconds > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <Mic size={12} />
                          {Math.floor(submission.duration_seconds / 60)}:{(submission.duration_seconds % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                      {getStatusBadge(submission)}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(submission.submitted_at)}
                    </div>
                  </div>
                </div>
                {/* Audio preview */}
                {submission.audio_url && (
                  <div className="mt-3 bg-gray-50 dark:bg-gray-700 rounded-lg p-2" onClick={(e) => e.stopPropagation()}>
                    <audio
                      controls
                      src={submission.audio_url}
                      className="w-full h-10"
                      preload="none"
                    />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
