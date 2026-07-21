import React from 'react';
import { VstepExamSet } from '../data/vstepReadingMock';

interface ExamListProps {
  exams: VstepExamSet[];
  onEdit: (exam: VstepExamSet) => void;
  onPreview: (exam: VstepExamSet) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export const ExamList: React.FC<ExamListProps> = ({ exams, onEdit, onPreview, onDelete }) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg dark:shadow-gray-900/30 p-4 md:p-8">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-indigo-900 dark:text-gray-100">Exam Sets</h2>
        <button
          onClick={() => onEdit({
            id: '',
            examTitle: '',
            description: '',
            skillType: 'reading',
            totalDurationMinutes: 60,
            totalQuestions: 40,
            passages: [],
            writingTasks: [],
            createdAt: new Date().toISOString()
          })}
          className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-semibold text-sm md:text-base hover:from-indigo-700 hover:to-indigo-800 transition-all"
        >
          + Create New Exam
        </button>
      </div>

      {/* Mobile: Card View */}
      <div className="md:hidden space-y-3">
        {exams.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-sm">
            No exam sets found. Create one to get started!
          </div>
        ) : (
          exams.map(exam => (
            <div key={exam.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-100 dark:border-gray-600">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 mr-2">
                  <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{exam.examTitle}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{exam.description}</div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                  exam.skillType === 'reading' ? 'bg-indigo-100 text-indigo-700' :
                  exam.skillType === 'listening' ? 'bg-purple-100 text-purple-700' :
                  exam.skillType === 'speaking' ? 'bg-rose-100 text-rose-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  {exam.skillType === 'reading' ? 'Reading' :
                   exam.skillType === 'listening' ? 'Listening' :
                   exam.skillType === 'speaking' ? 'Speaking' : 'Writing'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                <span>{exam.totalDurationMinutes} mins</span>
                <span>{exam.passages.length} passages</span>
                <span>{exam.totalQuestions} questions</span>
                <span>{formatDate(exam.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onPreview(exam)} className="flex-1 py-2 rounded bg-blue-100 text-blue-700 text-xs font-semibold hover:bg-blue-200 transition-all">
                  Preview
                </button>
                <button onClick={() => onEdit(exam)} className="flex-1 py-2 rounded bg-indigo-100 text-indigo-700 text-xs font-semibold hover:bg-indigo-200 transition-all">
                  Edit
                </button>
                <button onClick={() => onDelete(exam.id)} className="flex-1 py-2 rounded bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition-all">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop: Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-4 px-4 text-indigo-900 dark:text-gray-100 font-semibold">Title</th>
              <th className="text-left py-4 px-4 text-indigo-900 dark:text-gray-100 font-semibold">Skill</th>
              <th className="text-left py-4 px-4 text-indigo-900 dark:text-gray-100 font-semibold">Duration</th>
              <th className="text-left py-4 px-4 text-indigo-900 dark:text-gray-100 font-semibold">Passages</th>
              <th className="text-left py-4 px-4 text-indigo-900 dark:text-gray-100 font-semibold">Questions</th>
              <th className="text-left py-4 px-4 text-indigo-900 dark:text-gray-100 font-semibold">Created</th>
              <th className="text-right py-4 px-4 text-indigo-900 dark:text-gray-100 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {exams.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                  No exam sets found. Create one to get started!
                </td>
              </tr>
            ) : (
              exams.map(exam => (
                <tr key={exam.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-4 px-4">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{exam.examTitle}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{exam.description}</div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      exam.skillType === 'reading' ? 'bg-indigo-100 text-indigo-700' :
                      exam.skillType === 'listening' ? 'bg-purple-100 text-purple-700' :
                      exam.skillType === 'speaking' ? 'bg-rose-100 text-rose-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {exam.skillType === 'reading' ? 'Reading' :
                       exam.skillType === 'listening' ? 'Listening' :
                       exam.skillType === 'speaking' ? 'Speaking' : 'Writing'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-700 dark:text-gray-300">{exam.totalDurationMinutes} mins</td>
                  <td className="py-4 px-4 text-gray-700 dark:text-gray-300">{exam.passages.length}</td>
                  <td className="py-4 px-4 text-gray-700 dark:text-gray-300">{exam.totalQuestions}</td>
                  <td className="py-4 px-4 text-gray-700 dark:text-gray-300">{formatDate(exam.createdAt)}</td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onPreview(exam)}
                        className="px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => onEdit(exam)}
                        className="px-3 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(exam.id)}
                        className="px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
