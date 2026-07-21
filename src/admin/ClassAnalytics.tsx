import React, { useEffect, useState } from 'react';
import {
  fetchAssignmentLeaderboard, fetchPendingStudents, fetchClassScoreDistribution,
  LeaderboardEntry, ScoreDistribution, Assignment,
} from '../lib/supabaseService';
import { ArrowLeft, Loader2, Trophy, BarChart3, Clock, Users } from 'lucide-react';

interface ClassAnalyticsProps {
  assignment: Assignment;
  onBack: () => void;
}

export const ClassAnalytics: React.FC<ClassAnalyticsProps> = ({ assignment, onBack }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [pendingStudents, setPendingStudents] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [scoreDistribution, setScoreDistribution] = useState<ScoreDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [lb, pending, dist] = await Promise.all([
          fetchAssignmentLeaderboard(assignment.id),
          fetchPendingStudents(assignment.id),
          fetchClassScoreDistribution(assignment.class_id, assignment.exam_id),
        ]);
        setLeaderboard(lb);
        setPendingStudents(pending);
        setScoreDistribution(dist);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [assignment.id, assignment.class_id, assignment.exam_id]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const maxCount = Math.max(...scoreDistribution.map(d => d.count), 1);

  const isExpired = new Date(assignment.deadline) < new Date();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={40} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6 transition-colors">
        <ArrowLeft size={20} /> Back to Class
      </button>

      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Trophy size={28} className="text-indigo-600" />
              <h2 className="text-2xl font-bold text-indigo-900">{assignment.title}</h2>
            </div>
            <p className="text-gray-600">Exam: {assignment.exam_title}</p>
            <p className={`text-sm mt-1 flex items-center gap-1 ${isExpired ? 'text-red-500' : 'text-emerald-600'}`}>
              <Clock size={14} />
              Deadline: {new Date(assignment.deadline).toLocaleDateString('vi-VN', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
              {isExpired ? ' (Expired)' : ' (Active)'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Score Distribution */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-bold text-emerald-700 mb-4 flex items-center gap-2">
            <BarChart3 size={20} /> Score Distribution
          </h3>
          {scoreDistribution.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">No scores yet</p>
          ) : (
            <div className="space-y-2">
              {scoreDistribution.map((d) => (
                <div key={d.range} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-16 shrink-0">{d.range}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${(d.count / maxCount) * 100}%`, minWidth: d.count > 0 ? '2rem' : '0' }}
                    >
                      {d.count > 0 && (
                        <span className="text-xs font-bold text-white">{d.count}</span>
                      )}
                    </div>
                  </div>
                  {d.count === 0 && (
                    <span className="text-xs text-gray-400 w-6">0</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Submissions */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-bold text-amber-600 mb-4 flex items-center gap-2">
            <Users size={20} /> Pending Submissions
          </h3>
          {pendingStudents.length === 0 ? (
            <p className="text-emerald-600 bg-emerald-50 rounded-lg px-4 py-3 text-sm font-medium">
              All students have submitted.
            </p>
          ) : (
            <div className="space-y-2">
              {pendingStudents.map(s => (
                <div key={s.id} className="flex items-center justify-between bg-amber-50 rounded-lg px-4 py-3">
                  <div>
                    <span className="font-medium text-gray-800">{s.full_name}</span>
                    <span className="text-sm text-gray-500 ml-2">{s.email}</span>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">Pending</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-bold text-indigo-700 mb-4 flex items-center gap-2">
            <Trophy size={20} /> Leaderboard
          </h3>
          {leaderboard.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">No submissions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-semibold text-gray-600 w-12">Rank</th>
                    <th className="text-left py-3 px-2 font-semibold text-gray-600">Name</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-600">Score (VSTEP)</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-600">Raw Score</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-600">Time</th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-600">Submitted Date</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, idx) => (
                    <tr key={entry.student_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                          idx === 1 ? 'bg-gray-200 text-gray-600' :
                          idx === 2 ? 'bg-orange-100 text-orange-700' :
                          'text-gray-500'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-medium text-gray-800">{entry.full_name}</td>
                      <td className="py-3 px-2 text-center font-bold text-indigo-600">{entry.score_vstep.toFixed(1)}</td>
                      <td className="py-3 px-2 text-center text-gray-600">{entry.score_raw.toFixed(1)}</td>
                      <td className="py-3 px-2 text-center text-gray-500">{formatTime(entry.time_spent_seconds)}</td>
                      <td className="py-3 px-2 text-right text-gray-500">
                        {entry.submitted_at
                          ? new Date(entry.submitted_at).toLocaleDateString('vi-VN', {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
