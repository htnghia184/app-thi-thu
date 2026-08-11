import React, { useState } from 'react';
import { submitSpeakingGrade } from '../lib/supabaseService';
import {
  ArrowLeft, Loader2, CheckCircle, AlertCircle,
  Send, User, FileText, Clock, Headphones, Mic, Volume2, Download
} from 'lucide-react';

interface SpeakingGradeDetailProps {
  submission: any;
  onBack: () => void;
  onGraded: () => void;
  /** Role người đang chấm — chỉ admin mới được tải audio về */
  userRole?: string | null;
}

export const SpeakingGradeDetail: React.FC<SpeakingGradeDetailProps> = ({
  submission,
  onBack,
  onGraded,
  userRole,
}) => {
  const canDownload = userRole === 'admin';
  const [score, setScore] = useState<number>(submission.grade?.score ?? 5);
  const [feedback, setFeedback] = useState<string>(submission.grade?.feedback ?? '');
  const [criteria, setCriteria] = useState<Record<string, boolean>>({
    pronunciation: submission.grade?.criteria_scores?.pronunciation ? true : false,
    fluency: submission.grade?.criteria_scores?.fluency ? true : false,
    vocabulary: submission.grade?.criteria_scores?.vocabulary ? true : false,
    coherence: submission.grade?.criteria_scores?.coherence ? true : false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmitGrade = async () => {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await submitSpeakingGrade(
        submission.id,
        submission.user_id,
        score,
        feedback,
        {
          pronunciation: criteria.pronunciation ? 1 : 0,
          fluency: criteria.fluency ? 1 : 0,
          vocabulary: criteria.vocabulary ? 1 : 0,
          coherence: criteria.coherence ? 1 : 0,
        }
      );
      setSubmitSuccess(true);
      setTimeout(() => {
        onGraded();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to submit grade:', err);
      setSubmitError(err.message || 'Failed to submit grade');
    } finally {
      setSubmitting(false);
    }
  };

  const isGraded = !!submission.grade;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-gradient-to-r from-rose-900 to-pink-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-white/70 hover:text-white transition-colors mr-2"
            >
              <ArrowLeft size={20} />
            </button>
            <Headphones size={24} className="text-rose-300" />
            <div>
              <h1 className="text-xl font-bold">Grade Speaking</h1>
              <p className="text-rose-200 text-sm">
                {submission.exam_title} - {submission.passage_title || `Part ${submission.passage_id}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-rose-200 text-sm">
            <User size={16} />
            <span>{submission.user_name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Student Info & Audio */}
          <div className="space-y-6">
            {/* Student Info */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {(submission.user_name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{submission.user_name}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <span className="flex items-center gap-1">
                      <FileText size={14} />
                      {submission.passage_title || `Part ${submission.passage_id}`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {formatDate(submission.submitted_at)}
                    </span>
                  </div>
                </div>
              </div>
              {submission.duration_seconds > 0 && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Mic size={14} />
                  <span>Recording duration: {formatDuration(submission.duration_seconds)}</span>
                </div>
              )}
            </div>

            {/* Audio Player */}
            {submission.audio_url ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 overflow-hidden">
                <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-3 text-white">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2">
                      <Volume2 size={18} />
                      Student Recording
                    </h3>
                    {canDownload && (
                      <a
                        href={submission.audio_url}
                        download={`speaking-${submission.passage_title || `part-${submission.passage_id}`}-${submission.user_name}.webm`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-medium transition-all"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download size={14} />
                        Download
                      </a>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  <audio
                    controls
                    src={submission.audio_url}
                    className="w-full"
                    preload="metadata"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-8 text-center">
                <AlertCircle size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">Audio file not available</p>
              </div>
            )}
          </div>

          {/* Right: Grading Form */}
          <div className="space-y-6">
            {/* Score Input */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-6">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <CheckCircle size={18} className="text-emerald-500" />
                Score
              </h3>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={score}
                  onChange={(e) => setScore(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-rose-600"
                />
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-rose-600 dark:text-rose-400">{score.toFixed(1)}</span>
                  <span className="text-gray-400 text-sm">/10</span>
                </div>
              </div>
              <div className="mt-3 flex gap-1 h-2 rounded-full overflow-hidden">
                {Array.from({ length: 10 }, (_, i) => (
                  <div
                    key={i}
                    className={`flex-1 ${
                      i < Math.round(score)
                        ? i < 4 ? 'bg-red-400' : i < 7 ? 'bg-amber-400' : 'bg-emerald-400'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                <span>Poor</span>
                <span>Average</span>
                <span>Excellent</span>
              </div>
            </div>

            {/* Criteria Checkboxes */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-6">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Criteria Assessment</h3>
              <div className="space-y-3">
                {[
                  { key: 'pronunciation', label: 'Pronunciation & Intonation' },
                  { key: 'fluency', label: 'Fluency & Pace' },
                  { key: 'vocabulary', label: 'Vocabulary & Expression' },
                  { key: 'coherence', label: 'Coherence & Organization' },
                ].map((criterion) => (
                  <label
                    key={criterion.key}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-rose-300 hover:bg-rose-50/50 dark:hover:bg-gray-700 transition-all cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={criteria[criterion.key]}
                      onChange={(e) =>
                        setCriteria((prev) => ({ ...prev, [criterion.key]: e.target.checked }))
                      }
                      className="w-5 h-5 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{criterion.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-6">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <FileText size={18} className="text-indigo-500" />
                Feedback
              </h3>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Write your feedback for the student..."
                rows={6}
                className="w-full p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl resize-y focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:bg-gray-700"
              />
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {submitError && (
                <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
                  <AlertCircle size={16} />
                  {submitError}
                </div>
              )}
              {submitSuccess && (
                <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm">
                  <CheckCircle size={16} />
                  Grade submitted successfully! Redirecting...
                </div>
              )}

              <button
                onClick={handleSubmitGrade}
                disabled={submitting || submitSuccess}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    {isGraded ? 'Update Grade' : 'Submit Grade'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
