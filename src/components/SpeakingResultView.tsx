import React from 'react';
import { CheckCircle } from 'lucide-react';

interface SpeakingResultViewProps {
  passages: any[];
  timeTaken: number;
  onReset: () => void;
}

export const SpeakingResultView: React.FC<SpeakingResultViewProps> = ({
  passages,
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
          <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-rose-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Speaking Test Completed!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Your speaking recordings have been submitted for grading.</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/30 rounded-lg text-rose-700 dark:text-rose-300 text-sm font-medium">
            <span>Time taken: {formatTime(timeTaken)}</span>
          </div>
          <div className="mt-8">
            <button onClick={onReset} className="px-6 py-3 bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Your Recordings</h3>
          {passages.map((passage) => (
            <div key={passage.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-rose-600 to-pink-600 px-6 py-4 text-white">
                <h3 className="text-lg font-bold">{passage.title || `Part ${passage.id}`}</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  {passage.passageText?.substring(0, 200)}...
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
