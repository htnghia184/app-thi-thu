import React, { useState, useEffect, useCallback } from 'react';
import { fetchWritingSubmissions } from '../lib/supabaseService';
import { WritingGradeDetail } from './WritingGradeDetail';
import {
  ArrowLeft,
  Search,
  Filter,
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
  BookMarked,
  User,
  FileText,
  GraduationCap,
} from 'lucide-react';

interface WritingGradingProps {
  user: any;
  userId: string;
  onBack: () => void;
}

type StatusFilter = 'all' | 'pending' | 'graded';

export const WritingGrading: React.FC<WritingGradingProps> = ({
  user,
  userId,
  onBack,
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
      const data = await fetchWritingSubmissions({
        teacherId: userId,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setSubmissions(data);
    } catch (err: any) {
      console.error('Failed to fetch writing submissions:', err);
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
      s.task_type?.toLowerCase().includes(term)
    );
  });

  const handleGraded = () => {
    setSelectedSubmission(null);
    loadSubmissions();
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

  const getTaskTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      email: 'bg-blue-100 text-blue-700',
      letter: 'bg-purple-100 text-purple-700',
      essay: 'bg-emerald-100 text-emerald-700',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
        <FileText size={12} />
        {type}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Show detail view if a submission is selected
  if (selectedSubmission) {
    return (
      <WritingGradeDetail
        submission={selectedSubmission}
        onBack={() => setSelectedSubmission(null)}
        onGraded={handleGraded}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-900 to-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-white/70 hover:text-white transition-colors mr-2"
            >
              <ArrowLeft size={20} />
            </button>
            <GraduationCap size={28} className="text-emerald-300" />
            <div>
              <h1 className="text-xl font-bold">Writing Grading</h1>
              <p className="text-indigo-200 text-sm">
                Review and grade student writing submissions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-indigo-200 text-sm">
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
                placeholder="Search by student name, exam, or task type..."
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
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{submissions.length}</div>
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
            <Loader2 size={32} className="animate-spin text-indigo-600" />
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
            <BookMarked size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {searchTerm ? 'No submissions match your search' : 'No writing submissions yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {searchTerm
                ? 'Try a different search term or filter.'
                : 'Submissions will appear here once students complete writing tasks.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map((submission) => (
              <button
                key={submission.id}
                onClick={() => setSelectedSubmission(submission)}
                className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-6 hover:shadow-xl transition-all hover:scale-[1.01] border-l-4 border-l-transparent hover:border-l-indigo-500"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(submission.user_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-indigo-900 dark:text-gray-100 truncate">
                          {submission.user_name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{submission.exam_title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {getTaskTypeBadge(submission.task_type)}
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
                <div className="mt-3 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {submission.content || 'No content'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
