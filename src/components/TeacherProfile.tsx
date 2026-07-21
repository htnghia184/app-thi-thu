import React, { useEffect, useState } from 'react';
import {
  getUserProfile, updateProfile, fetchTeacherClasses,
  fetchClassStudents, fetchTeacherStats, TeacherStats,
  ClassData, StudentProfile,
} from '../lib/supabaseService';
import {
  ArrowLeft, User, Mail, BookOpen, Users, School, BarChart3, Award,
  Loader2, Save, Edit3, X, LogOut, ChevronRight, Moon, Sun,
} from 'lucide-react';

interface TeacherProfileProps {
  user: any;
  onBack: () => void;
  onLogout: () => void;
  isDark: boolean;
  toggleDarkMode: () => void;
}

export const TeacherProfile: React.FC<TeacherProfileProps> = ({ user, onBack, onLogout, isDark, toggleDarkMode }) => {
  const [profile, setProfile] = useState<any>(null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editCertificates, setEditCertificates] = useState('');
  const [saving, setSaving] = useState(false);

  // View students in a class
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [classStudents, setClassStudents] = useState<StudentProfile[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, c, s] = await Promise.all([
          getUserProfile(user.id),
          fetchTeacherClasses(user.id),
          fetchTeacherStats(user.id),
        ]);
        setProfile(p);
        setClasses(c);
        setStats(s);
        setEditName(p?.full_name || '');
        setEditBio(p?.bio || '');
        setEditCertificates(p?.certificates || '');
      } catch (err) {
        console.error('Failed to load teacher profile:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(user.id, {
        full_name: editName,
        bio: editBio,
        certificates: editCertificates,
      });
      setProfile((prev: any) => ({
        ...prev,
        full_name: editName,
        bio: editBio,
        certificates: editCertificates,
      }));
      setEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleViewClassStudents = async (c: ClassData) => {
    setSelectedClass(c);
    setStudentsLoading(true);
    try {
      const students = await fetchClassStudents(c.id);
      setClassStudents(students);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setStudentsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  // View students of a specific class
  if (selectedClass) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <header className="bg-gradient-to-r from-indigo-900 to-indigo-700 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-8 py-4 flex items-center gap-4">
            <button onClick={() => setSelectedClass(null)} className="text-white/70 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <School size={24} />
            <h1 className="text-xl font-bold">{selectedClass.name} - Students</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-8 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            {studentsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
              </div>
            ) : classStudents.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-center py-10">No students enrolled in this class.</p>
            ) : (
              <div className="space-y-2">
                {classStudents.map(s => (
                  <div key={s.id} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-5 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {(s.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{s.full_name || 'Unnamed'}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">{s.email}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-900 to-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-white/70 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <User size={24} />
            <h1 className="text-xl font-bold">Teacher Profile</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => {
              const root = document.documentElement;
              if (root.classList.contains('dark')) {
                root.classList.remove('dark');
                root.style.colorScheme = 'light';
              } else {
                root.classList.add('dark');
                root.style.colorScheme = 'dark';
              }
              localStorage.setItem('vstep-dark-mode', root.classList.contains('dark') ? 'dark' : 'light');
              toggleDarkMode();
            }} className="text-indigo-200 hover:text-white transition-colors" title="Toggle dark mode">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={onLogout} className="flex items-center gap-1.5 text-indigo-200 hover:text-white text-sm transition-colors">
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-8 space-y-6">
        {/* Professional Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-700 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {(editName || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                {editing ? (
                  <div className="space-y-3">
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Full name"
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                    />
                    <textarea
                      value={editBio}
                      onChange={e => setEditBio(e.target.value)}
                      placeholder="Brief introduction about yourself..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    />
                    <input
                      value={editCertificates}
                      onChange={e => setEditCertificates(e.target.value)}
                      placeholder="Certificates (e.g. VSTEP C1 / IELTS 8.0)"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-indigo-900 dark:text-indigo-400">{profile?.full_name || 'Teacher'}</h2>
                    <div className="flex items-center gap-4 mt-2 text-gray-600 dark:text-gray-400 text-sm">
                      <span className="flex items-center gap-1"><Mail size={14} /> {profile?.email}</span>
                    </div>
                    {profile?.certificates && (
                      <div className="mt-3 flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg text-amber-800 dark:text-amber-300 text-sm font-medium">
                        <Award size={16} /> {profile.certificates}
                      </div>
                    )}
                    {profile?.bio && (
                      <p className="mt-3 text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{profile.bio}</p>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0 ml-4">
              {editing ? (
                <>
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all text-sm disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save
                  </button>
                  <button onClick={() => setEditing(false)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-sm"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg font-semibold hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-all text-sm"
                >
                  <Edit3 size={16} /> Edit
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">{stats?.exams_created || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
              <BookOpen size={14} /> Exams Created
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">{stats?.classes_count || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
              <School size={14} /> Classes
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">{stats?.total_students || 0}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
              <Users size={14} /> Students
            </div>
          </div>
        </div>

        {/* Assigned Classes */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-400 mb-4 flex items-center gap-2">
            <School size={20} /> Assigned Classes
          </h3>
          {classes.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm py-4 text-center">You are not assigned to any class yet.</p>
          ) : (
            <div className="space-y-3">
              {classes.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleViewClassStudents(c)}
                  className="w-full flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl px-5 py-4 transition-colors text-left"
                >
                  <div>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{c.name}</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{c.description || 'No description'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Users size={14} /> {c.student_count || 0} students
                    </span>
                    <ChevronRight size={18} className="text-gray-400 dark:text-gray-500" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Teaching Stats Detail */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-400 mb-4 flex items-center gap-2">
            <BarChart3 size={20} /> Teaching Analytics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{stats?.exams_created || 0}</div>
              <div className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">Exams Created</div>
              <div className="text-xs text-indigo-400 dark:text-indigo-500 mt-1">Exams you have authored</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats?.classes_count || 0}</div>
              <div className="text-sm text-purple-600 dark:text-purple-400 mt-1">Active Classes</div>
              <div className="text-xs text-purple-400 dark:text-purple-500 mt-1">Classes you are teaching</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-xl p-6 text-center">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats?.total_students || 0}</div>
              <div className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">Students Managed</div>
              <div className="text-xs text-emerald-400 dark:text-emerald-500 mt-1">Across all your classes</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
