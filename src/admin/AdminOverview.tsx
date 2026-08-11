import React, { useEffect, useState, useCallback } from 'react';
import {
  Loader2, RefreshCw, BookOpen, Users, GraduationCap, School,
  PhoneCall, ClipboardList, CheckCircle2, AlertCircle, ArrowRight,
  Phone, FileText, Clock,
} from 'lucide-react';
import { fetchAdminStats, fetchExamLeads } from '../lib/supabaseService';

interface AdminOverviewProps {
  onNavigate: (tab: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<any>(null);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [s, leads] = await Promise.all([fetchAdminStats(), fetchExamLeads()]);
      setStats(s);
      setRecentLeads((leads || []).slice(0, 8));
    } catch (err: any) {
      console.error('Failed to load admin stats:', err);
      setError('Không thể tải thống kê. Kiểm tra kết nối Supabase và đã chạy migration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (d: string) => new Date(d).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const statusBadge = (status?: string) => {
    const map: Record<string, string> = {
      unassigned: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
      assigned: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      graded: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    };
    const label: Record<string, string> = {
      unassigned: 'Chưa gán',
      assigned: 'Đã gán',
      graded: 'Đã chấm',
    };
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${map[status || 'unassigned']}`}>
        {label[status || 'unassigned']}
      </span>
    );
  };

  const cards = [
    { label: 'Đề thi', value: stats?.exams ?? 0, icon: BookOpen, color: 'text-indigo-600 bg-indigo-50', tab: 'exams' },
    { label: 'Học viên', value: stats?.students ?? 0, icon: Users, color: 'text-emerald-600 bg-emerald-50', tab: 'students' },
    { label: 'Giáo viên', value: stats?.teachers ?? 0, icon: GraduationCap, color: 'text-purple-600 bg-purple-50', tab: 'teachers' },
    { label: 'Lớp học', value: stats?.classes ?? 0, icon: School, color: 'text-blue-600 bg-blue-50', tab: 'classes' },
    { label: 'Guest Leads', value: stats?.leads ?? 0, icon: PhoneCall, color: 'text-rose-600 bg-rose-50', tab: 'leads' },
    { label: 'Cần chấm bài', value: stats?.pending_grading ?? 0, icon: ClipboardList, color: 'text-amber-600 bg-amber-50', tab: 'guest_grading' },
  ];

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 flex justify-center">
        <Loader2 size={28} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-indigo-900 dark:text-gray-100">Tổng quan hệ thống</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Toàn bộ dữ liệu trên Supabase — đề thi, học viên, giáo viên, lớp học, leads.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all text-sm"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 mb-4 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {cards.map(card => (
          <button
            key={card.label}
            onClick={() => onNavigate(card.tab)}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 p-5 text-left hover:shadow-xl hover:-translate-y-0.5 transition-all group"
          >
            <div className={`inline-flex p-2.5 rounded-lg mb-3 ${card.color}`}>
              <card.icon size={20} />
            </div>
            <div className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{card.value}</div>
            <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              {card.label}
              <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent leads */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-indigo-900 dark:text-gray-100 flex items-center gap-2">
              <PhoneCall size={18} className="text-rose-500" />
              Leads mới nhất
            </h3>
            <button
              onClick={() => onNavigate('leads')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Xem tất cả →
            </button>
          </div>
          {recentLeads.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              Chưa có lead nào.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentLeads.map(lead => (
                <div key={lead.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-sm flex-shrink-0">
                    {(lead.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{lead.full_name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 truncate">
                      <Phone size={11} />
                      {lead.phone} · <FileText size={11} /> {lead.exam_title || '-'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {statusBadge(lead.grading_status)}
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDate(lead.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending grading */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-indigo-900 dark:text-gray-100 flex items-center gap-2">
              <ClipboardList size={18} className="text-amber-500" />
              Bài chưa chấm (Writing/Speaking)
            </h3>
            <button
              onClick={() => onNavigate('guest_grading')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Vào chấm bài →
            </button>
          </div>
          {recentLeads.filter(l => l.grading_status !== 'graded').length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Tất cả bài viết đã được chấm. Tuyệt vời!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentLeads.filter(l => l.grading_status !== 'graded').slice(0, 6).map(lead => (
                <button
                  key={lead.id}
                  onClick={() => onNavigate('guest_grading')}
                  className="w-full px-5 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left"
                >
                  <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{lead.full_name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {lead.exam_title || '-'} · <span className="capitalize">{lead.skill_type || '-'}</span>
                    </div>
                  </div>
                  {statusBadge(lead.grading_status)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
