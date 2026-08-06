import React, { useState } from 'react';
import { WritingTask } from '../data/vstepReadingMock';
import { submitWritingSubmission } from '../lib/supabaseService';
import { Edit3, FileText, AlertCircle, BookOpen, Send, Loader2, CheckCircle } from 'lucide-react';

interface WritingViewProps {
  tasks: WritingTask[];
  writingAnswers: Record<number, string>;
  onWritingChange: (taskId: number, text: string) => void;
  userId?: string;
  examId?: string;
  onWritingSubmit?: () => void;
}

export const WritingView: React.FC<WritingViewProps> = ({
  tasks,
  writingAnswers,
  onWritingChange,
  userId,
  examId,
  onWritingSubmit,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const getWordCount = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'email': return '✉️';
      case 'letter': return '📝';
      case 'essay': return '📄';
      default: return '✍️';
    }
  };

  const getTaskLabel = (type: string) => {
    switch (type) {
      case 'email': return 'Email';
      case 'letter': return 'Letter';
      case 'essay': return 'Essay';
      default: return 'Writing';
    }
  };

  const hasContent = Object.values(writingAnswers).some((text) => text.trim().length > 0);

  const handleSubmit = async () => {
    if (!userId || !examId) {
      // Fallback: just call the callback if no DB connection
      if (onWritingSubmit) {
        onWritingSubmit();
      }
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // Submit each task that has content
      for (const task of tasks) {
        const content = writingAnswers[task.id] || '';
        if (content.trim()) {
          await submitWritingSubmission(
            userId,
            examId,
            task.id,
            content,
            task.taskType
          );
        }
      }
      setSubmitSuccess(true);
      setTimeout(() => {
        if (onWritingSubmit) {
          onWritingSubmit();
        }
      }, 1500);
    } catch (err: any) {
      console.error('Failed to submit writing:', err);
      setSubmitError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header info */}
      <div className="bg-white dark:bg-gray-800 border-b border-indigo-100 dark:border-gray-700 px-4 md:px-8 py-3 md:py-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <BookOpen size={20} className="md:size-[24px] text-indigo-600" />
            <div>
              <h2 className="text-sm md:text-lg font-bold text-indigo-900 dark:text-gray-100">Writing Section</h2>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                {tasks.length} task{tasks.length > 1 ? 's' : ''} total
              </p>
            </div>
          </div>
          {hasContent && (
            <button
              onClick={handleSubmit}
              disabled={submitting || submitSuccess}
              className="flex items-center gap-1 md:gap-2 px-3 md:px-6 py-2 md:py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm min-h-[44px]"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="md:size-[18px] animate-spin" />
                  <span className="hidden md:inline">Submitting...</span>
                </>
              ) : submitSuccess ? (
                <>
                  <CheckCircle size={16} className="md:size-[18px]" />
                  <span className="hidden md:inline">Submitted!</span>
                </>
              ) : (
                <>
                  <Send size={16} className="md:size-[18px]" />
                  <span className="hidden md:inline">Submit Writing</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6">
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
          {/* Error message */}
          {submitError && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
              <AlertCircle size={18} className="flex-shrink-0" />
              {submitError}
            </div>
          )}

          {/* Success message */}
          {submitSuccess && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm">
              <CheckCircle size={18} className="flex-shrink-0" />
              Your writing has been submitted successfully! Redirecting...
            </div>
          )}

          {tasks.map((task) => {
            const wordCount = getWordCount(writingAnswers[task.id] || '');
            const hasLimit = task.wordLimit > 0;
            const isOverLimit = hasLimit && wordCount > task.wordLimit;
            const wordPercent = hasLimit ? Math.min((wordCount / task.wordLimit) * 100, 100) : 0;

            return (
              <div key={task.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/30 overflow-hidden">
                {/* Task Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 md:px-6 py-3 md:py-4 text-white">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-0">
                    <div className="flex items-center gap-2 md:gap-3">
                      <span className="text-xl md:text-2xl">{getTaskIcon(task.taskType)}</span>
                      <div className="min-w-0">
                        <h3 className="text-sm md:text-lg font-bold break-words leading-snug">Task {task.taskNumber}: {getTaskLabel(task.taskType)}</h3>
                        <p className="text-indigo-200 text-xs md:text-sm break-words leading-snug">{task.instructions}</p>
                      </div>
                    </div>
                    <div className="text-right flex md:flex-col items-center md:items-end gap-2 md:gap-0">
                      <div className="text-xs md:text-sm text-indigo-200">Word Limit</div>
                      <div className="text-lg md:text-xl font-bold">{hasLimit ? task.wordLimit : '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Prompt */}
                <div className="px-4 md:px-6 py-4 md:py-5 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-100 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <FileText size={20} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">Prompt:</h4>
                      <div className="text-amber-800 dark:text-amber-200 text-sm leading-relaxed whitespace-pre-line">
                        {task.prompt}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Text Editor */}
                <div className="p-4 md:p-6">
                  <textarea
                    value={writingAnswers[task.id] || ''}
                    onChange={(e) => onWritingChange(task.id, e.target.value)}
                    placeholder={`Write your ${getTaskLabel(task.taskType)} here...`}
                    disabled={submitSuccess}
                    className="w-full h-48 md:h-64 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl resize-y focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:bg-gray-700 font-mono text-sm leading-relaxed disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                  />

                  {/* Word Counter */}
                  <div className="mt-3 flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-0">
                    <div className="flex items-center gap-2">
                      <Edit3 size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {wordCount} words
                      </span>
                      <div className="hidden md:block w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 ml-2">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOverLimit ? 'bg-red-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${wordPercent}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isOverLimit && (
                        <div className="flex items-center gap-1 text-red-500 dark:text-red-400 text-xs">
                          <AlertCircle size={12} />
                          <span>Over word limit ({wordCount}/{task.wordLimit})</span>
                        </div>
                      )}
                      {!isOverLimit && hasLimit && wordCount > 0 && (
                        <span className={`text-xs font-medium ${
                          wordCount >= task.wordLimit * 0.9 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                        }`}>
                          {wordCount}/{task.wordLimit}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Bottom submit button */}
          <div className="flex justify-center pb-12">
            <button
              onClick={handleSubmit}
              disabled={submitting || submitSuccess || !hasContent}
              className="flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 size={22} className="animate-spin" />
                  Submitting...
                </>
              ) : submitSuccess ? (
                <>
                  <CheckCircle size={22} />
                  Submitted Successfully!
                </>
              ) : (
                <>
                  <Send size={22} />
                  Submit Writing Test
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
