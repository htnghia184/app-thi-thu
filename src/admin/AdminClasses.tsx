import React, { useEffect, useState } from 'react';
import {
  fetchClasses, createClass, updateClass, deleteClass,
  fetchTeachers, fetchClassTeachers, assignTeacherToClass, removeTeacherFromClass,
  fetchAllStudents, fetchClassStudents, assignStudentToClass, removeStudentFromClass,
  fetchClassAssignments, createAssignment, deleteAssignment, fetchExams,
  ClassData, TeacherProfile, StudentProfile, Assignment, CreateAssignmentPayload,
} from '../lib/supabaseService';
import {
  Plus, ArrowLeft, Edit3, Trash2, Users, UserCheck, Loader2, X, ChevronRight, School, ClipboardList, Clock, AlertTriangle
} from 'lucide-react';
import { ClassAnalytics } from './ClassAnalytics';

type ViewMode = 'list' | 'detail' | 'form' | 'analytics';
type FormMode = 'create' | 'edit';

export const AdminClasses: React.FC<{ userId: string }> = ({ userId }) => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);

  // Form state
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');

  // Detail view data
  const [classTeachers, setClassTeachers] = useState<TeacherProfile[]>([]);
  const [classStudents, setClassStudents] = useState<StudentProfile[]>([]);
  const [allTeachers, setAllTeachers] = useState<TeacherProfile[]>([]);
  const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Assignment state
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allExams, setAllExams] = useState<any[]>([]);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentExamId, setAssignmentExamId] = useState('');
  const [assignmentDeadline, setAssignmentDeadline] = useState('');
  const [assignmentCreating, setAssignmentCreating] = useState(false);
  const [assignmentError, setAssignmentError] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const data = await fetchClasses();
      setClasses(data);
    } catch (err) {
      console.error('Failed to load classes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClasses(); }, []);

  const handleCreate = () => {
    setFormMode('create');
    setFormName('');
    setFormDesc('');
    setViewMode('form');
  };

  const handleEdit = (c: ClassData) => {
    setFormMode('edit');
    setFormName(c.name);
    setFormDesc(c.description);
    setSelectedClass(c);
    setViewMode('form');
  };

  const handleFormSave = async () => {
    if (!formName.trim()) return;
    try {
      if (formMode === 'create') {
        await createClass(formName.trim(), formDesc.trim(), userId);
      } else if (selectedClass) {
        await updateClass(selectedClass.id, formName.trim(), formDesc.trim());
      }
      setViewMode('list');
      setSelectedClass(null);
      loadClasses();
    } catch (err) {
      console.error('Failed to save class:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this class? This will remove all teacher/student assignments.')) return;
    try {
      await deleteClass(id);
      loadClasses();
    } catch (err) {
      console.error('Failed to delete class:', err);
    }
  };

  const handleViewDetail = async (c: ClassData) => {
    setSelectedClass(c);
    setViewMode('detail');
    setDetailLoading(true);
    try {
      const [teachers, students, allT, allS] = await Promise.all([
        fetchClassTeachers(c.id),
        fetchClassStudents(c.id),
        fetchTeachers(),
        fetchAllStudents(),
      ]);
      setClassTeachers(teachers);
      setClassStudents(students);
      setAllTeachers(allT);
      setAllStudents(allS);
      loadAssignments(c.id);
    } catch (err) {
      console.error('Failed to load class details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAssignTeacher = async (teacherId: string) => {
    if (!selectedClass) return;
    try {
      await assignTeacherToClass(selectedClass.id, teacherId);
      const updated = await fetchClassTeachers(selectedClass.id);
      setClassTeachers(updated);
      loadClasses();
    } catch (err) {
      console.error('Failed to assign teacher:', err);
    }
  };

  const handleRemoveTeacher = async (teacherId: string) => {
    if (!selectedClass) return;
    try {
      await removeTeacherFromClass(selectedClass.id, teacherId);
      const updated = await fetchClassTeachers(selectedClass.id);
      setClassTeachers(updated);
      loadClasses();
    } catch (err) {
      console.error('Failed to remove teacher:', err);
    }
  };

  const handleAssignStudent = async (studentId: string) => {
    if (!selectedClass) return;
    try {
      await assignStudentToClass(selectedClass.id, studentId);
      const updated = await fetchClassStudents(selectedClass.id);
      setClassStudents(updated);
      loadClasses();
    } catch (err) {
      console.error('Failed to assign student:', err);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedClass) return;
    try {
      await removeStudentFromClass(selectedClass.id, studentId);
      const updated = await fetchClassStudents(selectedClass.id);
      setClassStudents(updated);
      loadClasses();
    } catch (err) {
      console.error('Failed to remove student:', err);
    }
  };

  const loadAssignments = async (classId: string) => {
    try {
      const [assignData, supabaseExams] = await Promise.all([
        fetchClassAssignments(classId),
        fetchExams(),
      ]);
      // fetchExams() trả về mọi đề trong bảng exams (reading/speaking + listening/writing
      // đã được seed) nên dropdown assign được đủ 4 kỹ năng.
      const allExams = [...(supabaseExams || [])];
      setAssignments(assignData);
      setAllExams(allExams);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    }
  };

  const handleCreateAssignment = async () => {
    setAssignmentError('');
    if (!selectedClass) return;
    if (!assignmentTitle.trim() || !assignmentExamId || !assignmentDeadline) {
      setAssignmentError('Vui lòng điền đầy đủ: tiêu đề, đề thi và hạn nộp.');
      return;
    }
    setAssignmentCreating(true);
    try {
      const payload: CreateAssignmentPayload = {
        class_id: selectedClass.id,
        exam_id: assignmentExamId,
        title: assignmentTitle.trim(),
        deadline: assignmentDeadline,
        created_by: userId,
      };
      await createAssignment(payload);
      setShowAssignmentForm(false);
      setAssignmentTitle('');
      setAssignmentExamId('');
      setAssignmentDeadline('');
      setAssignmentError('');
      loadAssignments(selectedClass.id);
    } catch (err: any) {
      // Map lỗi Supabase sang thông báo tiếng Việt dễ hiểu
      const code = err?.code;
      if (code === '23503') {
        setAssignmentError('Không thể tạo bài tập: đề thi không tồn tại hoặc đã bị xóa. Vui lòng chọn đề khác.');
      } else if (code === '42501') {
        setAssignmentError('Bạn không có quyền tạo bài tập cho lớp này.');
      } else if (code === '23505') {
        setAssignmentError('Bài tập này đã tồn tại.');
      } else {
        setAssignmentError('Không thể tạo bài tập. Vui lòng thử lại.');
      }
      console.error('Failed to create assignment:', err);
    } finally {
      setAssignmentCreating(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm('Delete this assignment?')) return;
    try {
      await deleteAssignment(id);
      if (selectedClass) loadAssignments(selectedClass.id);
    } catch (err) {
      console.error('Failed to delete assignment:', err);
    }
  };

  const handleViewAnalytics = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setViewMode('analytics');
  };

  const isExpired = (deadline: string) => new Date(deadline) < new Date();

  const availableTeachers = allTeachers.filter(
    t => !classTeachers.some(ct => ct.id === t.id)
  );
  const availableStudents = allStudents.filter(
    s => !classStudents.some(cs => cs.id === s.id)
  );

  // ========== Form View ==========
  if (viewMode === 'form') {
    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={() => setViewMode('list')} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6 transition-colors">
          <ArrowLeft size={20} /> Back to Classes
        </button>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-indigo-900 mb-6">
            {formMode === 'create' ? 'Create New Class' : 'Edit Class'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class Name *</label>
              <input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g. Advanced English - Class A"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                placeholder="Optional description..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={handleFormSave} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all">
                {formMode === 'create' ? 'Create Class' : 'Save Changes'}
              </button>
              <button onClick={() => setViewMode('list')} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== Detail View ==========
  if (viewMode === 'detail' && selectedClass) {
    if (detailLoading) {
      return (
        <div className="flex justify-center py-20">
          <Loader2 size={40} className="animate-spin text-indigo-600" />
        </div>
      );
    }
    return (
      <div>
        <button onClick={() => { setViewMode('list'); setSelectedClass(null); }} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6 transition-colors">
          <ArrowLeft size={20} /> Back to Classes
        </button>

        {/* Class header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <School size={28} className="text-indigo-600" />
                <h2 className="text-2xl font-bold text-indigo-900">{selectedClass.name}</h2>
              </div>
              <p className="text-gray-600">{selectedClass.description || 'No description'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(selectedClass)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                <Edit3 size={18} />
              </button>
              <button onClick={() => handleDelete(selectedClass.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
          <div className="flex gap-6 mt-4 text-sm text-gray-500">
            <span><Users size={14} className="inline mr-1" />{classStudents.length} students</span>
            <span><UserCheck size={14} className="inline mr-1" />{classTeachers.length} teachers</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Teachers section */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2"><UserCheck size={20} /> Assigned Teachers</h3>

            {/* Current teachers */}
            <div className="space-y-2 mb-4">
              {classTeachers.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">No teachers assigned yet</p>
              ) : (
                classTeachers.map(t => (
                  <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                    <div>
                      <span className="font-medium text-gray-800">{t.full_name || 'Unnamed'}</span>
                      <span className="text-sm text-gray-500 ml-2">{t.email}</span>
                    </div>
                    <button onClick={() => handleRemoveTeacher(t.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add teacher */}
            {availableTeachers.length > 0 && (
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-600 mb-2">Add Teacher</label>
                <select
                  onChange={e => { if (e.target.value) handleAssignTeacher(e.target.value); e.target.value = ''; }}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>Select a teacher...</option>
                  {availableTeachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name || t.email}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Students section */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2"><Users size={20} /> Enrolled Students</h3>

            {/* Current students */}
            <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
              {classStudents.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">No students enrolled yet</p>
              ) : (
                classStudents.map(s => (
                  <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                    <div>
                      <span className="font-medium text-gray-800">{s.full_name || 'Unnamed'}</span>
                      <span className="text-sm text-gray-500 ml-2">{s.email}</span>
                    </div>
                    <button onClick={() => handleRemoveStudent(s.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add student */}
            {availableStudents.length > 0 && (
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-600 mb-2">Add Student</label>
                <select
                  onChange={e => { if (e.target.value) handleAssignStudent(e.target.value); e.target.value = ''; }}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>Select a student...</option>
                  {availableStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Assignments section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2"><ClipboardList size={20} /> Assignments</h3>
            <button
              onClick={() => setShowAssignmentForm(!showAssignmentForm)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all text-sm"
            >
              <Plus size={16} /> Create Assignment
            </button>
          </div>

          {/* Create assignment form */}
          {showAssignmentForm && (
            <div className="bg-indigo-50 rounded-xl p-5 mb-4 border border-indigo-100 space-y-3">
              <input
                value={assignmentTitle}
                onChange={e => setAssignmentTitle(e.target.value)}
                placeholder="Assignment title..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
              />
              <select
                value={assignmentExamId}
                onChange={e => setAssignmentExamId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              >
                <option value="">Select an exam...</option>
                {allExams.map(exam => (
                  <option key={exam.id} value={exam.id}>{exam.examTitle}</option>
                ))}
              </select>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Deadline</label>
                <input
                  type="datetime-local"
                  value={assignmentDeadline}
                  onChange={e => setAssignmentDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                />
              </div>
              {assignmentError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {assignmentError}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCreateAssignment}
                  disabled={assignmentCreating}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {assignmentCreating ? <Loader2 size={16} className="animate-spin" /> : null}
                  Create
                </button>
                <button
                  onClick={() => { setShowAssignmentForm(false); setAssignmentTitle(''); setAssignmentExamId(''); setAssignmentDeadline(''); }}
                  className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Current assignments */}
          <div className="space-y-2">
            {assignments.length === 0 ? (
              <p className="text-gray-400 text-sm py-4 text-center">No assignments yet</p>
            ) : (
              assignments.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => handleViewAnalytics(a)}>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-800 hover:text-indigo-600 transition-colors">{a.title}</span>
                    <span className="text-sm text-gray-500 ml-3">{a.exam_title}</span>
                    <span className={`text-xs ml-3 inline-flex items-center gap-1 ${isExpired(a.deadline) ? 'text-red-500' : 'text-emerald-600'}`}>
                      <Clock size={12} />
                      {new Date(a.deadline).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {isExpired(a.deadline) && <AlertTriangle size={12} />}
                    </span>
                    <span className={`text-xs ml-2 px-2 py-0.5 rounded-full ${isExpired(a.deadline) ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                      {isExpired(a.deadline) ? 'Expired' : 'Active'}
                    </span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteAssignment(a.id); }}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0 ml-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ========== Analytics View ==========
  if (viewMode === 'analytics' && selectedAssignment) {
    return (
      <ClassAnalytics
        assignment={selectedAssignment}
        onBack={() => { setViewMode('detail'); setSelectedAssignment(null); }}
      />
    );
  }

  // ========== List View ==========
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-indigo-900">Class Management</h2>
        <button onClick={handleCreate} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md">
          <Plus size={18} /> Create Class
        </button>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xl p-16 text-center">
          <School size={64} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">No classes yet. Create your first class!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(c => (
            <div key={c.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <School size={24} className="text-indigo-600" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(c)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-indigo-900 mb-1">{c.name}</h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{c.description || 'No description'}</p>
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <span className="flex items-center gap-1"><Users size={14} /> {c.student_count} students</span>
                <span className="flex items-center gap-1"><UserCheck size={14} /> {c.teacher_count} teachers</span>
              </div>
              <button onClick={() => handleViewDetail(c)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-medium hover:bg-indigo-100 transition-colors">
                Manage <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
