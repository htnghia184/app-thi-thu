import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, RefreshCw, Phone, Mail, User, FileText, TrendingUp } from 'lucide-react';
import { fetchExamLeads } from '../lib/supabaseService';

export const AdminLeads: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchExamLeads();
      setLeads(data || []);
    } catch (err: any) {
      console.error('Failed to load leads:', err);
      setError('Không thể tải danh sách leads. Hãy chắc chắn đã chạy migration 006_guest_leads.sql và 007_guest_grading.sql.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const formatTime = (s?: number | null) => {
    if (!s && s !== 0) return '-';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-indigo-900 dark:text-gray-100">Guest Leads</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Người thi thử miễn phí đã để lại thông tin — nguồn potential lead.
          </p>
        </div>
        <button
          onClick={loadLeads}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all text-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 mb-4 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 flex justify-center">
          <Loader2 size={28} className="animate-spin text-indigo-600" />
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center text-gray-500 dark:text-gray-400">
          <p className="text-sm">Chưa có lead nào.</p>
          <p className="text-xs mt-1">Khi guest thi thử và để lại thông tin, danh sách sẽ hiện ở đây.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">#</th>
                  <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Khách hàng</th>
                  <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Liên hệ</th>
                  <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Passcode</th>
                  <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Đề thi</th>
                  <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Kỹ năng</th>
                  <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Trạng thái</th>
                  <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Kết quả</th>
                  <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Giáo viên chấm</th>
                  <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Thời gian</th>
                  <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Ngày</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, index) => (
                  <tr key={lead.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-sm">{index + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 text-sm font-medium">
                        <User size={14} className="text-indigo-500 flex-shrink-0" />
                        {lead.full_name}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                          <Phone size={13} className="text-emerald-500" />
                          <a href={`tel:${lead.phone}`} className="hover:text-indigo-600">{lead.phone}</a>
                        </div>
                        {lead.email && (
                          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs">
                            <Mail size={12} className="text-blue-500" />
                            {lead.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {lead.passcode ? (
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-semibold tracking-wider">
                          {lead.passcode}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 text-sm max-w-[200px] truncate">
                        <FileText size={13} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">{lead.exam_title || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 capitalize">
                        {lead.skill_type || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {lead.grading_status === 'graded' ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                          Đã chấm
                        </span>
                      ) : lead.grading_status === 'assigned' ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                          Đã gán
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          Chưa gán
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {lead.score_vstep != null ? (
                        <div className="flex items-center gap-1.5">
                          <TrendingUp size={14} className="text-emerald-500" />
                          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{lead.score_vstep}</span>
                          <span className="text-xs text-gray-400">({lead.score_raw}/{lead.total_questions ?? '-'})</span>
                        </div>
                      ) : lead.grade_score != null ? (
                        <div className="flex items-center gap-1.5">
                          <TrendingUp size={14} className="text-emerald-500" />
                          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{lead.grade_score}</span>
                          <span className="text-xs text-gray-400">/10</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {lead.assigned_teacher_name ? (
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {lead.assigned_teacher_name}
                          {lead.grader_name && lead.grader_name !== lead.assigned_teacher_name && (
                            <span className="block text-xs text-gray-400">chấm bởi: {lead.grader_name}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{formatTime(lead.time_spent_seconds)}</td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
