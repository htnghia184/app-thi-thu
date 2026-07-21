import React, { useEffect, useState } from 'react';
import {
  fetchUserExamResults, getUserProfile, updateProfile,
  fetchStudentClassIds,
} from '../lib/supabaseService';
import {
  ArrowLeft, User, Mail, Phone, BookOpen, Trophy, Target, BarChart3, Clock,
  Loader2, Save, History, School, LogOut, Moon, Sun,
} from 'lucide-react';

interface StudentProfileProps {
  user: any;
  onBack: () => void;
  onViewHistory: () => void;
  onLogout: () => void;
  isDark: boolean;
  toggleDarkMode: () => void;
}

const TARGET_SCORES = [
  { value: '', label: 'No target set', description: '' },
  { value: 'A2', label: 'A2', description: 'Elementary' },
  { value: 'B1', label: 'B1', description: 'Intermediate' },
  { value: 'B2', label: 'B2', description: 'Upper Intermediate' },
  { value: 'C1', label: 'C1', description: 'Advanced' },
];

// Rough mapping of target score to VSTEP score
const TARGET_VSTEP: Record<string, number> = {
  A2: 3.5,
  B1: 4.0,
  B2: 5.5,
  C1: 7.0,
};

export const StudentProfile: React.FC<StudentProfileProps> = ({ user, onBack, onViewHistory, onLogout, isDark, toggleDarkMode }) => {
  const [profile, setProfile] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTargetScore, setEditTargetScore] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, r, c] = await Promise.all([
          getUserProfile(user.id),
          fetchUserExamResults(user.id),
          fetchStudentClassIds(user.id),
        ]);
        setProfile(p);
        setResults(r || []);
        setClassIds(c || []);
        setEditName(p?.full_name || '');
        setEditPhone(p?.phone || '');
        setEditTargetScore(p?.target_score || '');
      } catch (err) {
        console.error('Failed to load profile:', err);
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
        phone: editPhone,
        target_score: editTargetScore,
      });
      setProfile((prev: any) => ({
        ...prev,
        full_name: editName,
        phone: editPhone,
        target_score: editTargetScore,
      }));
      setEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const totalExams = results.length;
  const scores = results.map(r => r.score_vstep);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

  const targetVstep = TARGET_VSTEP[editTargetScore] || 0;
  const progressPct = targetVstep > 0 ? Math.min(100, Math.round((bestScore / targetVstep) * 100)) : 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
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
            <h1 className="text-xl font-bold">My Profile</h1>
          </div>
          <div className="flex items-center gap-4">
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
            }} className="text-indigo-200 hover:text-white text-sm transition-colors" title="Toggle dark mode">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={onViewHistory} className="flex items-center gap-1.5 text-indigo-200 hover:text-white text-sm transition-colors">
              <History size={16} />
              History
            </button>
            <button onClick={onLogout} className="flex items-center gap-1.5 text-indigo-200 hover:text-white text-sm transition-colors">
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-8 space-y-6">
        {/* Personal Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {(editName || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                {editing ? (
                  <div className="space-y-3">
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Full name"
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-64"
                    />
                    <input
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                      placeholder="Phone number"
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-64"
                    />
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-indigo-900 dark:text-indigo-400">{profile?.full_name || 'Student'}</h2>
                    <div className="flex items-center gap-4 mt-2 text-gray-600 dark:text-gray-400 text-sm">
                      <span className="flex items-center gap-1"><Mail size={14} /> {profile?.email}</span>
                      <span className="flex items-center gap-1"><Phone size={14} /> {profile?.phone || 'No phone'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
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
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg font-semibold hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-all text-sm"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Classes */}
          {classIds.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
                <School size={16} /> Enrolled Classes
              </h3>
              <div className="flex flex-wrap gap-2">
                {classIds.map(cid => (
                  <span key={cid} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium">
                    Class #{cid.slice(0, 8)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">{totalExams}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
              <BookOpen size={14} /> Tests Completed
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">{avgScore ? avgScore.toFixed(1) : '-'}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
              <BarChart3 size={14} /> Avg VSTEP Score
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-1">{bestScore ? bestScore.toFixed(1) : '-'}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
              <Trophy size={14} /> Personal Best
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">{results.length > 0 ? formatTime(results.reduce((a: number, r: any) => a + (r.time_spent_seconds || 0), 0)) : '-'}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
              <Clock size={14} /> Total Time
            </div>
          </div>
        </div>

        {/* Target Score */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-400 mb-4 flex items-center gap-2">
            <Target size={20} /> Target Score
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Set your VSTEP target</label>
              <select
                value={editTargetScore}
                onChange={e => setEditTargetScore(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {TARGET_SCORES.map(t => (
                  <option key={t.value} value={t.value}>{t.label} - {t.description}</option>
                ))}
              </select>
              {editing && (
                <button onClick={handleSave} disabled={saving}
                  className="mt-2 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all text-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Target
                </button>
              )}
            </div>
            <div>
              {editTargetScore ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Progress to {editTargetScore}</span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{progressPct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, progressPct)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Best: {bestScore.toFixed(1)} / Target: {targetVstep.toFixed(1)}
                    {progressPct >= 100 ? ' — Goal achieved!' : ''}
                  </p>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                  <Target size={32} className="mr-2 opacity-50" />
                  Select a target to track progress
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Exam History */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-400 flex items-center gap-2">
              <History size={20} /> Recent Exam History
            </h3>
            {results.length > 5 && (
              <button onClick={onViewHistory} className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium">
                View All ({results.length})
              </button>
            )}
          </div>
          {results.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm py-4 text-center">No exams taken yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-2 font-semibold text-gray-600 dark:text-gray-400">Exam</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-600 dark:text-gray-400">Date</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-600 dark:text-gray-400">Score</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-600 dark:text-gray-400">Correct</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-600 dark:text-gray-400">Time</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-600 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.slice(0, 10).map((r: any) => (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-2 font-medium text-gray-800 dark:text-gray-200">{r.exams?.title || 'Practice Test'}</td>
                      <td className="py-3 px-2 text-gray-500 dark:text-gray-400">
                        {new Date(r.submitted_at).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-indigo-600 dark:text-indigo-400">{r.score_vstep?.toFixed(1)}</td>
                      <td className="py-3 px-2 text-center text-gray-600 dark:text-gray-400">{r.score_raw}/40</td>
                      <td className="py-3 px-2 text-center text-gray-500 dark:text-gray-400">{formatTime(r.time_spent_seconds)}</td>
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={onViewHistory}
                          className="px-3 py-1 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-all text-xs font-medium"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
