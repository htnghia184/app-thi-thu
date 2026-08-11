import React, { useEffect, useState, useCallback } from 'react';
import { fetchAllStudentsWithStats, fetchStudentDetailResults, StudentWithStats, adminDeleteUser } from '../lib/supabaseService';
import { Users, BarChart3, Trophy, Calendar, Clock, ArrowLeft, Loader2, Mail, BookOpen, UserPlus, Trash2 } from 'lucide-react';
import { CreateUserModal } from './CreateUserModal';

interface AdminStudentsProps {
  onBack: () => void;
}

interface AdminStudentsExtendedProps extends AdminStudentsProps {
  teacherId?: string;
}

export const AdminStudents: React.FC<AdminStudentsExtendedProps> = ({ onBack: _onBack, teacherId }) => {
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const isAdmin = !teacherId;

  const load = useCallback(async () => {
    try {
      const data = await fetchAllStudentsWithStats(teacherId);
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (student: StudentWithStats) => {
    if (!window.confirm(`Xóa tài khoản học viên "${student.full_name || student.email}"?\n\nToàn bộ kết quả làm bài của học viên cũng sẽ bị xóa.`)) return;
    try {
      await adminDeleteUser(student.id);
      await load();
    } catch (err: any) {
      alert('Không thể xóa học viên: ' + (err?.message || err));
    }
  };

  const handleViewStudent = async (studentId: string) => {
    setSelectedStudentId(studentId);
    setResultsLoading(true);
    try {
      const data = await fetchStudentDetailResults(studentId);
      setStudentResults(data || []);
    } catch (err) {
      console.error('Failed to load student results:', err);
    } finally {
      setResultsLoading(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const getVstepColor = (score: number) => {
    if (score >= 6.5) return 'text-green-600 bg-green-50';
    if (score >= 5.0) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const overallAvg = students.length > 0
    ? Math.round((students.reduce((s, st) => s + st.avg_score, 0) / students.length) * 10) / 10
    : 0;
  const totalExamsTaken = students.reduce((s, st) => s + st.total_exams, 0);
  const studentsWithExams = students.filter(s => s.total_exams > 0).length;

  // Student detail view
  if (selectedStudentId) {
    const student = students.find(s => s.id === selectedStudentId);
    if (resultsLoading) {
      return (
        <div className="flex justify-center py-20">
          <Loader2 size={40} className="animate-spin text-indigo-600" />
        </div>
      );
    }
    return (
      <div>
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setSelectedStudentId(null)} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors">
            <ArrowLeft size={20} /> Back to Students
          </button>
          <div className="h-6 w-px bg-gray-300" />
          <div>
            <h2 className="text-xl font-bold text-indigo-900">{student?.full_name || 'Student'}</h2>
            <p className="text-sm text-gray-500">{student?.email}</p>
          </div>
        </div>

        {studentResults.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600">No exam results yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {studentResults.map((r: any) => (
              <div key={r.id} className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-indigo-900">{r.exams?.title || 'Practice Test'}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      <Calendar size={14} className="inline mr-1" />
                      {formatDate(r.submitted_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`px-4 py-2 rounded-lg font-bold text-lg ${getVstepColor(r.score_vstep)}`}>
                      {r.score_vstep}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{r.score_raw}/{r.total_questions ?? 40} correct</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 border-t pt-3">
                  <span className="flex items-center gap-1"><Clock size={14} /> {Math.floor(r.time_spent_seconds / 60)}m {r.time_spent_seconds % 60}s</span>
                </div>
                <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${(r.score_raw / (r.total_questions ?? 40)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      {isAdmin && (
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all text-sm shadow-lg shadow-emerald-600/20"
          >
            <UserPlus size={16} />
            Tạo tài khoản học viên
          </button>
        </div>
      )}

      {/* Class Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 text-indigo-600 mb-2">
            <Users size={24} />
            <span className="text-sm font-medium text-gray-600">Total Students</span>
          </div>
          <div className="text-3xl font-bold text-indigo-900">{students.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 text-emerald-600 mb-2">
            <BarChart3 size={24} />
            <span className="text-sm font-medium text-gray-600">Class Avg Score</span>
          </div>
          <div className="text-3xl font-bold text-emerald-700">{overallAvg}</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 text-amber-600 mb-2">
            <BookOpen size={24} />
            <span className="text-sm font-medium text-gray-600">Tests Taken</span>
          </div>
          <div className="text-3xl font-bold text-amber-700">{totalExamsTaken}</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 text-purple-600 mb-2">
            <Trophy size={24} />
            <span className="text-sm font-medium text-gray-600">Active Students</span>
          </div>
          <div className="text-3xl font-bold text-purple-700">{studentsWithExams}</div>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-indigo-50 border-b border-indigo-100">
              <th className="text-left py-4 px-6 text-indigo-900 font-semibold">Student</th>
              <th className="text-center py-4 px-6 text-indigo-900 font-semibold">Tests Taken</th>
              <th className="text-center py-4 px-6 text-indigo-900 font-semibold">Best Score</th>
              <th className="text-center py-4 px-6 text-indigo-900 font-semibold">Avg Score</th>
              <th className="text-center py-4 px-6 text-indigo-900 font-semibold">Last Exam</th>
              <th className="text-right py-4 px-6 text-indigo-900 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500">No students registered yet.</td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${s.total_exams === 0 ? 'opacity-60' : ''}`}>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                        {(s.full_name || s.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{s.full_name || 'Unnamed'}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1"><Mail size={12} />{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center font-medium">{s.total_exams}</td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getVstepColor(s.best_score)}`}>{s.best_score}</span>
                  </td>
                  <td className="py-4 px-6 text-center font-medium text-gray-700">{s.avg_score}</td>
                  <td className="py-4 px-6 text-center text-sm text-gray-500">
                    {s.last_exam_date ? formatDate(s.last_exam_date) : '-'}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleViewStudent(s.id)} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium">
                        View Results
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(s)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Xóa học viên"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateUserModal
          role="student"
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
