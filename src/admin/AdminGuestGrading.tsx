import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Loader2, RefreshCw, Search, Filter, User, Phone, Mail, FileText,
  ClipboardList, CheckCircle2, Clock, GraduationCap, X, Save,
  AlertCircle, Mic, PenLine, TrendingUp, ShieldCheck, Download,
  ChevronDown, Layers,
} from 'lucide-react';
import {
  fetchGuestLeadsForGrading, fetchTeachers, assignTeacherToLead,
  submitGuestLeadGrade, getAudioUrl,
} from '../lib/supabaseService';
import { formatDateTime, formatTime, statusLabel, statusBadge, skillBadge } from '../utils/format';

interface AdminGuestGradingProps {
  userId: string;
  viewMode: 'admin' | 'teacher';
}

type StatusFilter = 'all' | 'unassigned' | 'assigned' | 'graded';
type SkillFilter = 'all' | 'writing' | 'speaking' | 'reading' | 'listening';

export const AdminGuestGrading: React.FC<AdminGuestGradingProps> = ({ userId, viewMode }) => {
  const isAdmin = viewMode === 'admin';

  const [leads, setLeads] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [skillFilter, setSkillFilter] = useState<SkillFilter>('all');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  /** Thứ tự hiển thị kỹ năng trong 1 hierarchy */
  const skillOrder = ['reading', 'listening', 'writing', 'speaking'];
  /** Mở / đóng các kỹ năng con của từng lead (hierarchy) */
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchGuestLeadsForGrading({
        teacherId: isAdmin ? undefined : userId,
      });
      setLeads(data || []);
      if (isAdmin) {
        const t = await fetchTeachers();
        setTeachers(t || []);
      }
    } catch (err: any) {
      console.error('Failed to load guest leads for grading:', err);
      setError('Không thể tải danh sách bài cần chấm. Kiểm tra đã chạy migration 006_guest_grading.sql.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (statusFilter !== 'all' && l.grading_status !== statusFilter) return false;
      if (skillFilter !== 'all' && (l.skill_type || '') !== skillFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const haystack = `${l.full_name || ''} ${l.phone || ''} ${l.email || ''} ${l.exam_title || ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [leads, statusFilter, skillFilter, searchTerm]);

  /** Nhóm lead trùng (cùng session bộ đề — 4 kỹ năng) thành 1 hierarchy: 1 lead / 1 người / 1 lần thi */
  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const l of filtered) {
      const key = l.session_id || l.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      items: items.sort((a, b) => skillOrder.indexOf(a.skill_type) - skillOrder.indexOf(b.skill_type)),
    }));
  }, [filtered]);

  const stats = useMemo(() => {
    // Thống kê theo hierarchy (lead) — mỗi lead chỉ đếm 1 lần (1 lead / 1 người / 1 lần thi).
    // Chỉ writing/speaking cần chấm thủ công; reading/listening tự chấm nên coi như xong.
    // Các nhóm rời nhau: chưa gán + đang chờ chấm + đã chấm = tổng lead.
    const needsManual = (l: any) =>
      (l.skill_type === 'writing' || l.skill_type === 'speaking') && l.grading_status !== 'graded';
    let unassigned = 0;
    let assigned = 0;
    let graded = 0;
    for (const g of groups) {
      const manual = g.items.filter(needsManual);
      if (manual.length === 0) {
        graded++;
      } else if (manual.some(l => l.grading_status === 'assigned')) {
        assigned++;
      } else {
        unassigned++;
      }
    }
    return { total: groups.length, unassigned, assigned, graded };
  }, [groups]);

  const renderScore = (lead: any) => {
    if (lead.grade_score != null) {
      return (
        <div className="flex items-center gap-1.5">
          <TrendingUp size={14} className="text-emerald-500" />
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{lead.grade_score}</span>
          <span className="text-xs text-gray-400">/10</span>
        </div>
      );
    }
    if (lead.skill_type === 'reading' || lead.skill_type === 'listening') {
      return (
        <div className="flex items-center gap-1.5">
          <TrendingUp size={14} className="text-indigo-500" />
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{lead.score_vstep ?? '-'}</span>
          <span className="text-xs text-gray-400">(auto)</span>
        </div>
      );
    }
    return <span className="text-xs text-gray-400">-</span>;
  };

  const renderCustomer = (lead: any) => (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-xs flex-shrink-0">
        {(lead.full_name || '?').charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{lead.full_name}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Phone size={10} />
          <a href={`tel:${lead.phone}`} className="hover:text-indigo-600 dark:hover:text-indigo-400">{lead.phone}</a>
        </div>
        {lead.email && (
          <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 truncate">
            <Mail size={10} /> {lead.email}
          </div>
        )}
      </div>
    </div>
  );

  const handleAssign = async (leadId: string, teacherId: string) => {
    setSaving(true);
    try {
      await assignTeacherToLead(leadId, teacherId || null);
      await load();
    } catch (err: any) {
      alert('Không thể gán giáo viên: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  // ---------------- Render ----------------
  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-indigo-900 dark:text-gray-100">
            {isAdmin ? 'Chấm bài Guest' : 'Bài được giao chấm'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isAdmin
              ? 'Danh sách guest thi thử (nguồn lead) — gán giáo viên chấm bài viết / nói và theo dõi tiến độ.'
              : 'Các bài thi thử của guest được admin giao cho bạn chấm.'}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading || saving}
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <div className="text-2xl font-bold text-indigo-600">{stats.total}</div>
          <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Tổng lead</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">{stats.unassigned}</div>
          <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Chưa gán</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <div className="text-2xl font-bold text-amber-600">{stats.assigned}</div>
          <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Đang chờ chấm</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
          <div className="text-2xl font-bold text-emerald-600">{stats.graded}</div>
          <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Đã chấm</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6 flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên, sđt, email, đề thi..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-300 dark:bg-gray-700 dark:text-gray-200 outline-none transition-all text-sm"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={16} className="text-gray-400 hidden sm:block" />
          {/* Skill filter */}
          <select
            value={skillFilter}
            onChange={e => setSkillFilter(e.target.value as SkillFilter)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-200 outline-none capitalize"
          >
            <option value="all">Tất cả kỹ năng</option>
            <option value="writing">Writing</option>
            <option value="speaking">Speaking</option>
            <option value="reading">Reading</option>
            <option value="listening">Listening</option>
          </select>
          {/* Status filter */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(['all', 'unassigned', 'assigned', 'graded'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  statusFilter === s
                    ? 'bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
              >
                {s === 'all' ? 'Tất cả' : s === 'unassigned' ? 'Chưa gán' : s === 'assigned' ? 'Đã gán' : 'Đã chấm'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 flex justify-center">
          <Loader2 size={28} className="animate-spin text-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <ClipboardList size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Không có bài nào phù hợp.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">#</th>
                  <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Khách hàng</th>
                  {isAdmin && (
                    <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Passcode</th>
                  )}
                  <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Đề thi</th>
                  <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Kỹ năng</th>
                  <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Trạng thái</th>
                  {isAdmin && (
                    <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Giáo viên chấm</th>
                  )}
                  <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Điểm</th>
                  <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Thời gian</th>
                  <th className="text-left py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Ngày</th>
                  <th className="text-right py-3 px-4 text-indigo-900 dark:text-gray-100 font-semibold text-sm">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group, gi) => {
                  const isMulti = group.items.length > 1;
                  const head = group.items[0];
                  const expanded = !isMulti || !!expandedKeys[group.key];
                  const gradedCount = group.items.filter(l => l.grading_status === 'graded').length;
                  const assignedCount = group.items.filter(l => l.grading_status === 'assigned').length;
                  const unassignedCount = group.items.filter(l => l.grading_status === 'unassigned').length;

                  /** Dòng 1 kỹ năng (con của hierarchy). full = nhóm đơn lẻ → hiện đầy đủ thông tin */
                  const skillRow = (lead: any, subIndex: number, full: boolean) => (
                    <tr key={lead.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="py-3 px-4 text-xs text-gray-400">{full ? subIndex : `${gi + 1}.${subIndex}`}</td>
                      <td className="py-3 px-4">{full ? renderCustomer(lead) : null}</td>
                      {isAdmin && (
                        <td className="py-3 px-4">
                          {full ? (
                            lead.passcode ? (
                              <span className="inline-flex px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-semibold tracking-wider">
                                {lead.passcode}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )
                          ) : null}
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-700 dark:text-gray-300 max-w-[180px] truncate flex items-center gap-1.5">
                          <FileText size={13} className="text-gray-400 flex-shrink-0" />
                          {lead.exam_title || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4">{skillBadge(lead.skill_type)}</td>
                      <td className="py-3 px-4">{statusBadge(lead.grading_status)}</td>
                      {isAdmin && (
                        <td className="py-3 px-4">
                          <select
                            value={lead.assigned_teacher_id || ''}
                            disabled={saving}
                            onChange={e => handleAssign(lead.id, e.target.value)}
                            className="px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-700 dark:text-gray-200 outline-none max-w-[170px]"
                          >
                            <option value="">— Chưa gán —</option>
                            {teachers.map(t => (
                              <option key={t.id} value={t.id}>{t.full_name || t.email}</option>
                            ))}
                          </select>
                        </td>
                      )}
                      <td className="py-3 px-4">{renderScore(lead)}</td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatTime(lead.time_spent_seconds)}</td>
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {full ? formatDateTime(lead.created_at) : null}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            lead.grading_status === 'graded'
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {lead.grading_status === 'graded' ? 'Xem / Sửa' : 'Chấm bài'}
                        </button>
                      </td>
                    </tr>
                  );

                  if (!isMulti) {
                    return <React.Fragment key={group.key}>{skillRow(head, gi + 1, true)}</React.Fragment>;
                  }

                  return (
                    <React.Fragment key={group.key}>
                      {/* Dòng lead (hierarchy header) — thông tin liên hệ / passcode / ngày chỉ hiện 1 lần ở đây */}
                      <tr className="bg-indigo-50/70 dark:bg-indigo-900/10 border-b border-gray-200 dark:border-gray-700">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExpandedKeys(k => ({ ...k, [group.key]: !k[group.key] }))}
                              className="text-indigo-500 hover:text-indigo-700 transition-colors"
                              title={expanded ? 'Thu gọn kỹ năng' : 'Mở chi tiết kỹ năng'}
                            >
                              <ChevronDown size={16} className={`transition-transform ${expanded ? '' : '-rotate-90'}`} />
                            </button>
                            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{gi + 1}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">{renderCustomer(head)}</td>
                        {isAdmin && (
                          <td className="py-3 px-4">
                            {head.passcode ? (
                              <span className="inline-flex px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-semibold tracking-wider">
                                {head.passcode}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 flex-wrap">
                            <Layers size={13} className="text-indigo-400 flex-shrink-0" />
                            <span className="font-semibold text-indigo-700 dark:text-indigo-300">{group.items.length} kỹ năng</span>
                            {gradedCount === group.items.length ? (
                              <span className="text-emerald-600 font-semibold">· Đã chấm hết</span>
                            ) : (
                              <>
                                <span className="text-emerald-600 font-semibold">· {gradedCount} đã chấm</span>
                                {assignedCount > 0 && <span className="text-amber-600 font-semibold">· {assignedCount} đang chấm</span>}
                                {unassignedCount > 0 && <span className="text-gray-500 dark:text-gray-400 font-semibold">· {unassignedCount} chưa gán</span>}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4"><span className="text-xs text-gray-400">tất cả</span></td>
                        <td className="py-3 px-4"><span className="text-[11px] font-semibold text-indigo-500">1 lead</span></td>
                        {isAdmin && <td className="py-3 px-4" />}
                        <td className="py-3 px-4"><span className="text-xs text-gray-400">xem từng kỹ năng</span></td>
                        <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatTime(group.items.reduce((s, l) => s + (l.time_spent_seconds || 0), 0))}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateTime(head.created_at)}</td>
                        <td className="py-3 px-4 text-right" />
                      </tr>
                      {/* Các kỹ năng con (chỉ hiện khi mở) — không lặp thông tin liên hệ */}
                      {expanded && group.items.map((lead, index) => skillRow(lead, index + 1, false))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedLead && (
        <GradeModal
          lead={selectedLead}
          isAdmin={isAdmin}
          teachers={teachers}
          saving={saving}
          onClose={() => setSelectedLead(null)}
          onAssign={handleAssign}
          onSaveGrade={async (score, feedback) => {
            setSaving(true);
            try {
              await submitGuestLeadGrade(selectedLead.id, score, feedback, userId);
              await load();
              setSelectedLead(null);
            } catch (err: any) {
              alert('Không thể lưu điểm: ' + (err.message || err));
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
    </div>
  );
};

// ==================== Grade Modal ====================

interface GradeModalProps {
  lead: any;
  isAdmin: boolean;
  teachers: any[];
  saving: boolean;
  onClose: () => void;
  onAssign: (leadId: string, teacherId: string) => void;
  onSaveGrade: (score: number, feedback: string) => void;
}

const GradeModal: React.FC<GradeModalProps> = ({
  lead, isAdmin, teachers, saving, onClose, onAssign, onSaveGrade,
}) => {
  const [score, setScore] = useState<string>(lead.grade_score != null ? String(lead.grade_score) : '');
  const [feedback, setFeedback] = useState<string>(lead.grade_feedback || '');
  const [error, setError] = useState('');

  const isWriting = lead.skill_type === 'writing';
  const isSpeaking = lead.skill_type === 'speaking';
  const isAutoScored = lead.skill_type === 'reading' || lead.skill_type === 'listening';

  const writingAnswers: Record<string, string> = useMemo(() => {
    const raw = lead.writing_answers;
    if (!raw || typeof raw !== 'object') return {};
    const entries: [string, string][] = Object.entries(raw)
      .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
      .map(([k, v]) => [k, String(v)]);
    entries.sort(([a], [b]) => Number(a) - Number(b));
    return Object.fromEntries(entries);
  }, [lead.writing_answers]);

  const wordCount = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleSubmit = () => {
    const num = parseFloat(score);
    if (score === '' || isNaN(num) || num < 0 || num > 10) {
      setError('Điểm phải từ 0 đến 10 (có thể là số thập phân như 6.5).');
      return;
    }
    setError('');
    onSaveGrade(Math.round(num * 10) / 10, feedback.trim());
  };

  const showGradeForm = !isAutoScored || lead.grade_score != null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-bold text-indigo-900 dark:text-gray-100 flex items-center gap-2">
              <GraduationCap size={20} className="text-indigo-500" />
              Chấm bài — {lead.full_name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {lead.exam_title || 'Không rõ đề'} · {skillBadge(lead.skill_type)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Contact info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <User size={14} className="text-indigo-500" /> {lead.full_name}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                <Phone size={12} className="text-emerald-500" /> {lead.phone}
              </div>
              {lead.email && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <Mail size={12} className="text-blue-500" /> {lead.email}
                </div>
              )}
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Clock size={14} className="text-purple-500" /> {formatDateTime(lead.created_at)}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                <ClipboardList size={14} className="text-amber-500" />
                {statusLabel(lead.grading_status)}
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <ShieldCheck size={14} className="text-rose-500" /> Passcode: <span className="font-mono font-semibold">{lead.passcode || '-'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Auto score (reading/listening) */}
          {isAutoScored && (
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-800 dark:text-indigo-200">
                <TrendingUp size={16} /> Kết quả tự chấm (hệ thống)
              </div>
              <div className="mt-2 flex items-center gap-4">
                <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                  {lead.score_vstep ?? '-'} <span className="text-sm font-normal text-indigo-500">/10</span>
                </span>
                <span className="text-sm text-indigo-700 dark:text-indigo-300">
                  {lead.score_raw ?? 0}/{lead.total_questions ?? 0} câu đúng
                </span>
                <span className="text-sm text-indigo-700 dark:text-indigo-300">
                  {formatTime(lead.time_spent_seconds)}
                </span>
              </div>
            </div>
          )}

          {/* Writing content */}
          {isWriting && (
            <div>
              <h4 className="text-sm font-bold text-indigo-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <PenLine size={16} className="text-emerald-500" /> Bài viết của thí sinh
              </h4>
              {Object.keys(writingAnswers).length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-200 text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  Không có nội dung bài viết được lưu cho lead này.
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(writingAnswers).map(([taskId, text]) => (
                    <div key={taskId} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Task {taskId}</span>
                        <span className="text-xs text-gray-400">{wordCount(text)} từ</span>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">{text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Speaking audio */}
          {isSpeaking && (
            <div>
              <h4 className="text-sm font-bold text-indigo-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Mic size={16} className="text-rose-500" /> Bài nói của thí sinh
              </h4>
              {Array.isArray(lead.speaking_audio) && lead.speaking_audio.length > 0 ? (
                <div className="space-y-3">
                  {lead.speaking_audio.map((rec: any, i: number) => (
                    <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <div className="text-xs font-bold text-gray-600 dark:text-gray-300">
                          Part {rec.passage_number} — {rec.passage_title || 'Speaking'}
                          {rec.duration_seconds ? <span className="text-gray-400 font-normal"> · {rec.duration_seconds}s</span> : null}
                        </div>
                        {isAdmin && rec.audio_url && (
                          <a
                            href={getAudioUrl(rec.audio_url)}
                            download
                            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex-shrink-0"
                          >
                            <Download size={13} /> Tải về
                          </a>
                        )}
                      </div>
                      {rec.audio_url ? (
                        <audio controls src={getAudioUrl(rec.audio_url)} className="w-full" />
                      ) : (
                        <p className="text-xs text-amber-600 dark:text-amber-400">File ghi âm không có URL.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                  <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                    Không có file ghi âm nào được lưu cho lead này.
                    <br />
                    Bạn vẫn có thể ghi nhận điểm & feedback (sẽ gửi qua Zalo) nếu có thông tin thêm từ buổi tư vấn.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Grade form */}
          {showGradeForm && (
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-bold text-indigo-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                {lead.grade_score != null ? 'Cập nhật điểm' : 'Chấm điểm'}
              </h4>

              {isAdmin && (
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                    Gán giáo viên chấm
                  </label>
                  <select
                    value={lead.assigned_teacher_id || ''}
                    disabled={saving}
                    onChange={e => onAssign(lead.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-200 outline-none"
                  >
                    <option value="">— Chưa gán —</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.full_name || t.email}</option>
                    ))}
                  </select>
                </div>
              )}

              {lead.grade_score != null && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                    Đã chấm bởi {lead.grader_name || '—'} lúc {formatDateTime(lead.graded_at)}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                  Điểm (0 – 10) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={score}
                  onChange={e => setScore(e.target.value)}
                  placeholder="VD: 6.5"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                  Nhận xét (feedback) — gửi cho học viên qua Zalo
                </label>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  rows={4}
                  placeholder="Nhận xét chi tiết về bài làm, điểm mạnh, điểm cần cải thiện..."
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-300 resize-y"
                />
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Đang lưu...' : lead.grade_score != null ? 'Cập nhật điểm' : 'Lưu điểm'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

