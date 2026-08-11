import React, { useEffect, useState, useCallback } from 'react';
import {
  Loader2, RefreshCw, GraduationCap, Mail, School, Users,
  ClipboardList, CheckCircle2, UserPlus, Trash2,
} from 'lucide-react';
import { fetchTeachersWithStats, TeacherWithStats, adminDeleteUser } from '../lib/supabaseService';
import { CreateUserModal } from './CreateUserModal';

interface AdminTeachersProps {
  onNavigate: (tab: string) => void;
}

export const AdminTeachers: React.FC<AdminTeachersProps> = ({ onNavigate }) => {
  const [teachers, setTeachers] = useState<TeacherWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTeachersWithStats();
      setTeachers(data);
    } catch (err: any) {
      console.error('Failed to load teachers:', err);
      setError('Không thể tải danh sách giáo viên.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (teacher: TeacherWithStats) => {
    if (!window.confirm(`Xóa tài khoản giáo viên "${teacher.full_name || teacher.email}"?\n\nToàn bộ dữ liệu liên quan (lớp, học viên, kết quả...) cũng sẽ bị xóa.`)) return;
    try {
      await adminDeleteUser(teacher.id);
      await load();
    } catch (err: any) {
      alert('Không thể xóa giáo viên: ' + (err?.message || err));
    }
  };

  const totalPending = teachers.reduce((s, t) => s + t.assigned_pending, 0);
  const totalGraded = teachers.reduce((s, t) => s + t.graded_count, 0);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-indigo-900 dark:text-gray-100">Giáo viên</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Danh sách tài khoản giáo viên và khối lượng công việc (lớp, học viên, bài chờ chấm).
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all text-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
      <div className="-mt-4 mb-6 flex justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all text-sm shadow-lg shadow-emerald-600/20"
        >
          <UserPlus size={16} />
          Tạo tài khoản giáo viên
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
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
              <div className="text-2xl font-bold text-purple-600">{teachers.length}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Giáo viên</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
              <div className="text-2xl font-bold text-amber-600">{totalPending}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Bài đang chờ chấm</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
              <div className="text-2xl font-bold text-emerald-600">{totalGraded}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Bài đã chấm</div>
            </div>
          </div>

          {teachers.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center text-gray-500 dark:text-gray-400">
              <p className="text-sm">Chưa có giáo viên nào.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Giáo viên</th>
                      <th className="text-center py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Lớp phụ trách</th>
                      <th className="text-center py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Học viên</th>
                      <th className="text-center py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Đang chờ chấm</th>
                      <th className="text-center py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Đã chấm</th>
                      <th className="text-center py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map(t => (
                      <tr key={t.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold flex-shrink-0">
                              {(t.full_name || t.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                <GraduationCap size={14} className="text-purple-500 flex-shrink-0" />
                                <span className="truncate">{t.full_name || 'Chưa đặt tên'}</span>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Mail size={11} />
                                <span className="truncate">{t.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                            <School size={14} className="text-blue-500" /> {t.classes_count}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                            <Users size={14} className="text-emerald-500" /> {t.students_count}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 text-sm font-semibold ${t.assigned_pending > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                            <ClipboardList size={14} /> {t.assigned_pending}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                            <CheckCircle2 size={14} /> {t.graded_count}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => onNavigate('guest_grading')}
                              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                            >
                              Xem bài được gán →
                            </button>
                            <button
                              onClick={() => handleDelete(t)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                              title="Xóa giáo viên"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <CreateUserModal
          role="teacher"
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
};
