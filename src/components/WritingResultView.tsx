import React from 'react';
import { CheckCircle } from 'lucide-react';

interface WritingResultViewProps {
  tasks: any[];
  writingAnswers: Record<number, string>;
  timeTaken: number;
  onReset: () => void;
}

export const WritingResultView: React.FC<WritingResultViewProps> = ({
  tasks,
  writingAnswers,
  timeTaken,
  onReset,
}) => {
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-10 px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 text-center mb-8">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-indigo-900 dark:text-gray-100 mb-2">Writing Test Submitted!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Your writing responses have been recorded.</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-700 dark:text-indigo-300 text-sm font-medium">
            <span>Time taken: {formatTime(timeTaken)}</span>
          </div>
          <div className="mt-8">
            <button onClick={onReset} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
                <h3 className="text-lg font-bold">Task {task.taskNumber}: {task.taskType}</h3>
              </div>
              <div className="p-6">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Your Response:</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-gray-800 dark:text-gray-200 whitespace-pre-wrap min-h-[120px] border border-gray-200 dark:border-gray-600">
                  {writingAnswers[task.id] || <span className="text-gray-400 italic">No response submitted</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
