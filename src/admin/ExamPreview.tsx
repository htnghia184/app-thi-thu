import React, { useState } from 'react';
import { X, Clock, FileText, CheckCircle2, BookOpen, Eye } from 'lucide-react';
import { VstepExamSet } from '../data/vstepReadingMock';
import { passageToHtml } from '../utils/passageHtml';

interface ExamPreviewProps {
  exam: VstepExamSet;
  onClose: () => void;
}

const skillBadge = (skill: string) => {
  switch (skill) {
    case 'reading': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300';
    case 'listening': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
    case 'speaking': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
    default: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
  }
};

export const ExamPreview: React.FC<ExamPreviewProps> = ({ exam, onClose }) => {
  const [activePassage, setActivePassage] = useState(0);

  const totalQuestions = exam.passages.reduce((sum, p) => sum + p.questions.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-0 md:p-6 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-none md:rounded-2xl shadow-2xl my-0 md:my-6 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-6 py-4 bg-gradient-to-r from-indigo-900 to-indigo-700 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <Eye size={20} className="flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="font-bold text-base md:text-lg truncate">Preview: {exam.examTitle}</h2>
              <p className="text-indigo-200 text-xs truncate">{exam.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
            title="Close preview"
          >
            <X size={20} />
          </button>
        </div>

        {/* Overview stats */}
        <div className="flex flex-wrap items-center gap-3 px-4 md:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${skillBadge(exam.skillType)}`}>
            {exam.skillType === 'reading' ? 'Reading' :
             exam.skillType === 'listening' ? 'Listening' :
             exam.skillType === 'speaking' ? 'Speaking' : 'Writing'}
          </span>
          <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
            <Clock size={14} /> {exam.totalDurationMinutes} mins
          </span>
          <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
            <FileText size={14} /> {exam.passages.length} passages
          </span>
          <span className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
            <BookOpen size={14} /> {totalQuestions} questions
          </span>
        </div>

        {/* Passage tabs */}
        {exam.passages.length > 0 && (
          <div className="flex gap-2 px-4 md:px-6 pt-4 pb-2 overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-gray-700">
            {exam.passages.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setActivePassage(i)}
                className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all border-2 ${
                  activePassage === i
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-300'
                }`}
              >
                Passage {i + 1} ({p.questions.length} Qs)
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="px-4 md:px-6 py-5 max-h-[60vh] md:max-h-[65vh] overflow-y-auto">
          {exam.passages.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              This exam has no passages yet.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Passage text */}
              <div>
                <h3 className="font-semibold text-indigo-900 dark:text-gray-100 mb-2">
                  {exam.passages[activePassage].title || `Passage ${activePassage + 1}`}
                </h3>
                <div
                  className="passage-content text-sm md:text-base text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-gray-700 rounded-xl p-4 md:p-6 border border-gray-100 dark:border-gray-600"
                  dangerouslySetInnerHTML={{ __html: passageToHtml(exam.passages[activePassage].passageText) }}
                />
              </div>

              {/* Questions */}
              <div className="space-y-4">
                {exam.passages[activePassage].questions.map((q, qi) => (
                  <div key={q.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center">
                        {qi + 1}
                      </span>
                      <p className="text-sm md:text-base text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
                        {q.questionText}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-9">
                      {q.options.map((opt, oi) => (
                        <div
                          key={oi}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
                            q.correctAnswer === oi
                              ? 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                              : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            q.correctAnswer === oi
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}>
                            {String.fromCharCode(65 + oi)}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {q.correctAnswer === oi && <CheckCircle2 size={16} className="flex-shrink-0 text-green-500" />}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <p className="mt-3 pl-9 text-xs text-gray-500 dark:text-gray-400 italic">
                        Explanation: {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-4 md:px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
