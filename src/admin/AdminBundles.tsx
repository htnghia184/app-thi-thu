import React, { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, Layers, BookOpen, Headphones, BookMarked, Mic,
  X, Save, RefreshCw, CheckCircle2, Globe, Lock, EyeOff as EyeHidden,
  School, Calendar,
} from 'lucide-react';
import {
  fetchAllExamBundles, fetchExams, createExamBundle, updateExamBundle, deleteExamBundle,
  fetchClasses, getCurrentUser, fetchBundleAssignments, createBundleAssignment, deleteBundleAssignment,
  ExamBundle, ClassData, BundleAssignment,
} from '../lib/supabaseService';
import { formatDateTime } from '../utils/format';
import { VstepExamSet } from '../data/vstepReadingMock';

const skillMeta: Record<string, { icon: any; label: string; bg: string }> = {
  reading: { icon: BookOpen, label: 'Reading', bg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  listening: { icon: Headphones, label: 'Listening', bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  writing: { icon: BookMarked, label: 'Writing', bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  speaking: { icon: Mic, label: 'Speaking', bg: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
};

type Visibility = 'public' | 'private' | 'hidden';

const visibilityMeta: Record<Visibility, { label: string; icon: any; badge: string; desc: string }> = {
  public: { label: 'Công khai', icon: Globe, badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', desc: 'Mọi người (guest + student) thấy và thi được.' },
  private: { label: 'Nội bộ', icon: Lock, badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', desc: 'Chỉ student có tài khoản thấy và thi được.' },
  hidden: { label: 'Ẩn hoàn toàn', icon: EyeHidden, badge: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400', desc: 'Không ai thấy trên trang chủ, chỉ admin quản lý.' },
};

interface AdminBundlesProps {
  /** 'teacher' = chỉ tạo được bộ Nội bộ (private), chỉ quản lý bộ do mình tạo */
  viewMode?: 'admin' | 'teacher';
}

export const AdminBundles: React.FC<AdminBundlesProps> = ({ viewMode = 'admin' }) => {
  const isTeacher = viewMode === 'teacher';
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [bundles, setBundles] = useState<ExamBundle[]>([]);
  const [exams, setExams] = useState<VstepExamSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Visibility>('public');

  // Assign class state
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [assignBundle, setAssignBundle] = useState<ExamBundle | null>(null);
  const [assignments, setAssignments] = useState<BundleAssignment[]>([]);
  const [assignClassId, setAssignClassId] = useState('');
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDeadline, setAssignDeadline] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [b, e, c, u] = await Promise.all([
        fetchAllExamBundles(), fetchExams(), fetchClasses(), getCurrentUser(),
      ]);
      setBundles(b);
      setExams(e);
      setClasses(c);
      setCurrentUserId(u?.id || null);
    } catch (err: any) {
      console.error('Failed to load bundles:', err);
      setError('Không thể tải danh sách bộ đề. Kiểm tra đã chạy migration 010_exam_bundles.sql.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setTitle('');
    setDescription('');
    setSelectedIds([]);
    setVisibility(isTeacher ? 'private' : 'public');
    setError('');
    setModalOpen(true);
  };

  const openEdit = (b: ExamBundle) => {
    setEditId(b.id);
    setTitle(b.title);
    setDescription(b.description || '');
    setSelectedIds([...(b.exam_ids || [])]);
    setVisibility(isTeacher ? 'private' : (b.visibility || 'public'));
    setError('');
    setModalOpen(true);
  };

  const toggleExam = (examId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(examId)) return prev.filter(id => id !== examId);
      if (prev.length >= 4) return prev; // tối đa 4 đề
      return [...prev, examId];
    });
  };

  const handleSave = async () => {
    setError('');
    if (!title.trim()) { setError('Vui lòng nhập tên bộ đề.'); return; }
    if (selectedIds.length === 0) { setError('Vui lòng chọn ít nhất 1 đề.'); return; }
    setSaving(true);
    try {
      if (editId) {
        await updateExamBundle(editId, {
          title: title.trim(),
          description: description.trim(),
          exam_ids: selectedIds,
          visibility: isTeacher ? 'private' : visibility,
        });
      } else {
        await createExamBundle({
          title: title.trim(),
          description: description.trim(),
          exam_ids: selectedIds,
          visibility: isTeacher ? 'private' : visibility,
          // Bắt buộc gửi created_by để RLS "teacher chỉ quản lý bộ của mình" khớp
          created_by: currentUserId || undefined,
        });
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      console.error('Failed to save bundle:', err);
      setError('Không thể lưu bộ đề. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (b: ExamBundle) => {
    if (!window.confirm(`Xóa bộ đề "${b.title}"? Các session đã tạo sẽ không bị xóa.`)) return;
    try {
      await deleteExamBundle(b.id);
      load();
    } catch (err) {
      console.error('Failed to delete bundle:', err);
      setError('Không thể xóa bộ đề.');
    }
  };

  // ----- Giao bộ đề cho lớp (thi giữa kỳ / cuối kỳ) -----
  const openAssign = async (b: ExamBundle) => {
    setAssignBundle(b);
    setAssignClassId('');
    setAssignTitle(`Thi giữa kỳ — ${b.title}`);
    setAssignDeadline('');
    setAssignError('');
    setAssignLoading(true);
    try {
      setAssignments(await fetchBundleAssignments(b.id));
    } catch (err) {
      console.error('Failed to load bundle assignments:', err);
      setAssignments([]);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAssignSave = async () => {
    if (!assignBundle) return;
    setAssignError('');
    if (!assignClassId) { setAssignError('Vui lòng chọn lớp.'); return; }
    if (!assignTitle.trim()) { setAssignError('Vui lòng nhập tiêu đề.'); return; }
    if (!assignDeadline) { setAssignError('Vui lòng chọn hạn nộp (deadline).'); return; }

    const user = await getCurrentUser();
    if (!user) { setAssignError('Không xác định được người giao. Vui lòng đăng nhập lại.'); return; }

    setAssignSaving(true);
    try {
      await createBundleAssignment({
        bundle_id: assignBundle.id,
        class_id: assignClassId,
        title: assignTitle.trim(),
        deadline: new Date(assignDeadline).toISOString(),
        created_by: user.id,
      });
      setAssignments(await fetchBundleAssignments(assignBundle.id));
      setAssignClassId('');
      setAssignDeadline('');
    } catch (err: any) {
      console.error('Failed to assign bundle:', err);
      setAssignError('Không thể giao bộ đề cho lớp. Kiểm tra đã chạy migration 011_bundle_assignments.sql.');
    } finally {
      setAssignSaving(false);
    }
  };

  const handleUnassign = async (a: BundleAssignment) => {
    if (!window.confirm(`Gỡ "${a.title}" khỏi lớp "${a.class_name || ''}"?`)) return;
    try {
      await deleteBundleAssignment(a.id);
      if (assignBundle) setAssignments(await fetchBundleAssignments(assignBundle.id));
    } catch (err) {
      console.error('Failed to unassign bundle:', err);
      setAssignError('Không thể gỡ giao bộ đề.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-indigo-900 dark:text-gray-100 flex items-center gap-2">
            <Layers size={22} className="text-indigo-500" /> Exam Bundles
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gom 1-4 đề (public/private) thành bộ thi thử — guest chỉ thấy đề public, student thấy cả private.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2.5 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm transition-colors"
            title="Làm mới"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md"
          >
            <Plus size={18} /> New Bundle
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 flex justify-center">
          <Loader2 size={28} className="animate-spin text-indigo-600" />
        </div>
      ) : bundles.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center text-gray-500 dark:text-gray-400">
          <Layers size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Chưa có bộ đề nào</p>
          <p className="text-sm">Bấm "New Bundle" để gom các đề public thành bộ thi thử.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {bundles.map(b => {
            const vMeta = visibilityMeta[b.visibility] || visibilityMeta.hidden;
            const VIcon = vMeta.icon;
            const skillTypes = exams.filter(e => b.exam_ids.includes(e.id)).map(e => e.skillType);
            const isOwn = !isTeacher || b.created_by === currentUserId;
            return (
              <div key={b.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-base font-bold text-indigo-900 dark:text-gray-100 flex items-center gap-2">
                    {b.title}
                  </h3>
                  <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${vMeta.badge}`}>
                    <VIcon size={12} /> {vMeta.label}
                  </span>
                </div>
                {b.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{b.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {b.exam_ids.length === 0 ? (
                    <span className="text-xs text-gray-400">Chưa có đề</span>
                  ) : skillTypes.length > 0 ? (
                    skillTypes.map(skill => {
                      const meta = skillMeta[skill];
                      const Icon = meta?.icon || BookOpen;
                      return (
                        <span key={skill} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meta?.bg || 'bg-gray-100 text-gray-600'}`}>
                          <Icon size={12} /> {meta?.label || skill}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      {b.exam_ids.length} đề — đã bị xóa hoặc không còn hiển thị
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{b.exam_ids.length}/4 đề</span>
                </div>
                <div className="flex items-center gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                  {isOwn ? (
                    <>
                      <button
                        onClick={() => openEdit(b)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                      >
                        <Pencil size={14} /> Sửa
                      </button>
                      <button
                        onClick={() => openAssign(b)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                      >
                        <School size={14} /> Giao lớp
                      </button>
                      <button
                        onClick={() => handleDelete(b)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors ml-auto"
                      >
                        <Trash2 size={14} /> Xóa
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 italic ml-auto">Quản lý bởi admin</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal tạo / sửa bộ đề */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-indigo-900 dark:text-gray-100">
                {editId ? 'Sửa bộ đề' : 'Tạo bộ đề mới'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Tên bộ đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Bộ đề VSTEP Full 01"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Mô tả <span className="text-gray-400 font-normal">(không bắt buộc)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả ngắn gọn bộ thi thử này..."
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200 resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Chọn đề (tối đa 4)
                  </label>
                  <span className="text-xs text-gray-400">{selectedIds.length}/4 đã chọn</span>
                </div>
                {exams.length === 0 ? (
                  <p className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-500 dark:text-gray-400">
                    Chưa có đề nào. Vào tab Exams để tạo đề trước.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {exams.map(exam => {
                      const meta = skillMeta[exam.skillType] || skillMeta.reading;
                      const Icon = meta.icon;
                      const selected = selectedIds.includes(exam.id);
                      const atLimit = selectedIds.length >= 4 && !selected;
                      return (
                        <button
                          key={exam.id}
                          type="button"
                          onClick={() => toggleExam(exam.id)}
                          disabled={atLimit}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                            selected
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                              : atLimit
                                ? 'border-gray-100 dark:border-gray-700 opacity-40 cursor-not-allowed'
                                : 'border-gray-100 dark:border-gray-700 hover:border-indigo-300'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg ${meta.bg} flex-shrink-0`}>
                            <Icon size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{exam.examTitle}</div>
                            <div className="text-xs text-gray-400">{meta.label} · {exam.totalQuestions} câu</div>
                          </div>
                          {selected && <CheckCircle2 size={18} className="text-indigo-600 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Hiển thị cho ai?
                </label>
                {isTeacher ? (
                  <div className="flex items-start gap-3 p-3 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                    <div className={`p-1.5 rounded-lg ${visibilityMeta.private.badge} flex-shrink-0`}>
                      <Lock size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Nội bộ (private)</div>
                      <div className="text-xs text-gray-400">
                        Giáo viên chỉ tạo được bộ Nội bộ — student có tài khoản thấy và thi được, guest không thấy.
                      </div>
                    </div>
                    <CheckCircle2 size={18} className="text-blue-600 flex-shrink-0" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(Object.keys(visibilityMeta) as Visibility[]).map(v => {
                      const meta = visibilityMeta[v];
                      const VIcon = meta.icon;
                      const active = visibility === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setVisibility(v)}
                          className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                            active
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                              : 'border-gray-100 dark:border-gray-700 hover:border-indigo-300'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg ${meta.badge} flex-shrink-0`}>
                            <VIcon size={16} />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{meta.label}</div>
                            <div className="text-xs text-gray-400">{meta.desc}</div>
                          </div>
                          {active && <CheckCircle2 size={18} className="text-indigo-600 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-lg font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {editId ? 'Lưu thay đổi' : 'Tạo bộ đề'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal giao bộ đề cho lớp (thi giữa kỳ / cuối kỳ) */}
      {assignBundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAssignBundle(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-indigo-900 dark:text-gray-100 flex items-center gap-2">
                <School size={20} className="text-emerald-500" /> Giao bộ đề cho lớp
              </h3>
              <button onClick={() => setAssignBundle(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Bộ đề <span className="font-semibold text-indigo-700 dark:text-indigo-400">{assignBundle.title}</span> sẽ được giao cho lớp đã chọn
                (phù hợp thi giữa kỳ / cuối kỳ) — student trong lớp đó thấy và thi được ngay cả khi bộ đang ẩn.
              </p>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Chọn lớp <span className="text-red-500">*</span>
                </label>
                {classes.length === 0 ? (
                  <p className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-500 dark:text-gray-400">
                    Chưa có lớp nào. Vào tab Classes để tạo lớp trước.
                  </p>
                ) : (
                  <select
                    value={assignClassId}
                    onChange={(e) => setAssignClassId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"
                  >
                    <option value="">-- Chọn lớp --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.student_count ? ` (${c.student_count} học viên)` : ''}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  placeholder="VD: Thi giữa kỳ — Bộ đề Full 01"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Hạn nộp (deadline) <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={assignDeadline}
                  onChange={(e) => setAssignDeadline(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>

              {assignError && (
                <div className="p-3 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                  {assignError}
                </div>
              )}

              {/* Danh sách các lớp đã được giao */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={14} className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Đã giao cho {assignments.length > 0 ? `${assignments.length} lớp` : ''}
                  </span>
                </div>
                {assignLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={20} className="animate-spin text-indigo-600" />
                  </div>
                ) : assignments.length === 0 ? (
                  <p className="text-sm text-gray-400">Chưa giao cho lớp nào.</p>
                ) : (
                  <div className="space-y-2">
                    {assignments.map(a => (
                      <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{a.title}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <School size={12} /> {a.class_name} · Hạn: {formatDateTime(a.deadline)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleUnassign(a)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex-shrink-0"
                        >
                          <Trash2 size={12} /> Gỡ
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setAssignBundle(null)}
                className="px-4 py-2.5 rounded-lg font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={handleAssignSave}
                disabled={assignSaving || classes.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg font-semibold hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {assignSaving ? <Loader2 size={18} className="animate-spin" /> : <School size={18} />}
                Giao cho lớp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
