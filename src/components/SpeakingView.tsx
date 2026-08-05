import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Passage } from '../data/vstepReadingMock';
import { uploadSpeakingAudio, submitSpeakingSubmission } from '../lib/supabaseService';
import { passageToHtml } from '../utils/passageHtml';
import {
  Mic, Square, Loader2, CheckCircle, AlertCircle,
  Headphones, Trash2, Save, BookOpen
} from 'lucide-react';

interface SpeakingViewProps {
  passages: Passage[];
  userId?: string;
  examId?: string;
  onSpeakingSubmit?: () => void;
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading' | 'submitted';

interface PassageRecording {
  passageId: number;
  state: RecordingState;
  audioBlob: Blob | null;
  audioUrl: string | null;
  durationSeconds: number;
  submissionId?: string;
}

export const SpeakingView: React.FC<SpeakingViewProps> = ({
  passages,
  userId,
  examId,
  onSpeakingSubmit,
}) => {
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
  const [recordings, setRecordings] = useState<Record<number, PassageRecording>>({});
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const currentPassage = passages[currentPassageIndex];
  const currentRecording = recordings[currentPassage?.id];
  const recState = currentRecording?.state || 'idle';

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const getMediaStream = useCallback(async (): Promise<MediaStream> => {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Microphone access denied. Please allow microphone permission in your browser settings.');
      }
      throw new Error('Could not access microphone. Please check your device.');
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await getMediaStream();
      streamRef.current = stream;

      // Detect best available audio mime type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/aac',
        '',
      ];
      const preferredMime = mimeTypes.find(mt => !mt || MediaRecorder.isTypeSupported(mt)) || '';
      const mediaRecorder = new MediaRecorder(stream, preferredMime ? { mimeType: preferredMime } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordings(prev => ({
          ...prev,
          [currentPassage.id]: {
            passageId: currentPassage.id,
            state: 'recorded',
            audioBlob: blob,
            audioUrl: url,
            durationSeconds: recordingSeconds,
          },
        }));
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordingSeconds(0);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      };

      // Start recording
      setRecordingSeconds(0);
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      mediaRecorder.start();
      setRecordings(prev => ({
        ...prev,
        [currentPassage.id]: {
          passageId: currentPassage.id,
          state: 'recording',
          audioBlob: null,
          audioUrl: null,
          durationSeconds: 0,
        },
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to start recording');
    }
  }, [currentPassage?.id, getMediaStream, recordingSeconds]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const discardRecording = useCallback(() => {
    if (currentRecording?.audioUrl) {
      URL.revokeObjectURL(currentRecording.audioUrl);
    }
    setRecordings(prev => {
      const next = { ...prev };
      delete next[currentPassage.id];
      return next;
    });
  }, [currentPassage?.id, currentRecording]);

  const handleSubmit = async () => {
    if (!userId || !examId || !currentRecording?.audioBlob) {
      // Fallback: just notify
      if (onSpeakingSubmit) onSpeakingSubmit();
      return;
    }

    setError(null);
    setRecordings(prev => ({
      ...prev,
      [currentPassage.id]: { ...prev[currentPassage.id], state: 'uploading' },
    }));

    try {
      const audioUrl = await uploadSpeakingAudio(
        currentRecording.audioBlob,
        userId,
        examId,
        currentPassage.id
      );

      const submission = await submitSpeakingSubmission(
        userId,
        examId,
        currentPassage.id,
        currentPassage.title,
        audioUrl,
        currentRecording.durationSeconds
      );

      setRecordings(prev => ({
        ...prev,
        [currentPassage.id]: {
          ...prev[currentPassage.id],
          state: 'submitted',
          submissionId: submission.id,
        },
      }));

      // Check if all passages have been submitted
      const allDone = passages.every(p => {
        const rec = recordings[p.id];
        return rec?.state === 'submitted' || rec?.state === 'uploading';
      });

      if (allDone) {
        setTimeout(() => {
          if (onSpeakingSubmit) onSpeakingSubmit();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit recording');
      setRecordings(prev => ({
        ...prev,
        [currentPassage.id]: { ...prev[currentPassage.id], state: 'recorded' },
      }));
    }
  };

  const handleNextPassage = () => {
    if (currentPassageIndex < passages.length - 1) {
      setCurrentPassageIndex(prev => prev + 1);
      setError(null);
    }
  };

  const handlePrevPassage = () => {
    if (currentPassageIndex > 0) {
      setCurrentPassageIndex(prev => prev - 1);
      setError(null);
    }
  };

  // Check if we can submit everything
  const canFinishAll = passages.every(p => {
    const rec = recordings[p.id];
    return rec?.state === 'submitted' || rec?.state === 'uploading';
  });

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const renderRecordingButton = () => {
    switch (recState) {
      case 'idle':
        return (
          <button
            onClick={startRecording}
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-red-500 to-red-700 text-white rounded-2xl font-bold text-lg hover:shadow-xl transition-all shadow-lg hover:scale-105"
          >
            <Mic size={24} />
            Start Recording
          </button>
        );
      case 'recording':
        return (
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
              <span className="text-2xl font-mono font-bold text-red-600">
                {formatDuration(recordingSeconds)}
              </span>
            </div>
            <button
              onClick={stopRecording}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-2xl font-bold text-lg hover:shadow-xl transition-all shadow-lg"
            >
              <Square size={24} />
              Stop Recording
            </button>
          </div>
        );
      case 'recorded':
        return (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <audio
                key={currentRecording?.audioUrl}
                controls
                src={currentRecording?.audioUrl || ''}
                className="w-full max-w-md"
              />
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={discardRecording}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              >
                <Trash2 size={18} />
                Re-record
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all shadow-md"
              >
                <Save size={18} />
                Submit Recording
              </button>
            </div>
          </div>
        );
      case 'uploading':
        return (
          <div className="flex items-center justify-center gap-3">
            <Loader2 size={24} className="animate-spin text-indigo-600" />
            <span className="text-gray-600 dark:text-gray-400 font-medium">Uploading...</span>
          </div>
        );
      case 'submitted':
        return (
          <div className="flex items-center justify-center gap-3 text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={24} />
            <span className="font-bold text-lg">Submitted!</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-600 to-pink-700 text-white px-4 md:px-8 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <Headphones size={20} className="md:size-[24px]" />
            <div>
              <h2 className="text-sm md:text-lg font-bold">Speaking Section</h2>
              <p className="text-xs md:text-sm text-rose-200">
                Part {currentPassageIndex + 1} of {passages.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {passages.map((p, i) => (
              <button
                key={p.id}
                onClick={() => { setCurrentPassageIndex(i); setError(null); }}
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full text-xs md:text-sm font-bold transition-all ${
                  i === currentPassageIndex
                    ? 'bg-white text-rose-700'
                    : recordings[p.id]?.state === 'submitted'
                    ? 'bg-emerald-400/30 text-white'
                    : recordings[p.id]?.state === 'recorded'
                    ? 'bg-amber-400/30 text-white'
                    : 'bg-white/20 text-white/80 hover:bg-white/30'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
              <AlertCircle size={18} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Passage / Prompt Card */}
          {currentPassage && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/30 overflow-hidden">
              <div className="bg-gradient-to-r from-rose-600 to-pink-600 px-4 md:px-6 py-3 md:py-4 text-white">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} />
                  <h3 className="font-bold text-sm md:text-lg truncate">{currentPassage.title}</h3>
                </div>
                {currentPassage.recommendedMinutes && (
                  <p className="text-rose-200 text-xs md:text-sm mt-1">
                    Recommended time: {currentPassage.recommendedMinutes} minutes
                  </p>
                )}
              </div>
              <div className="p-4 md:p-6">
                <div
                  className="text-gray-800 dark:text-gray-200 text-sm md:text-base leading-relaxed whitespace-pre-line passage-content"
                  dangerouslySetInnerHTML={{ __html: passageToHtml(currentPassage.passageText) }}
                />
              </div>
            </div>
          )}

          {/* Recording Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/30 p-6 md:p-8">
            <div className="flex flex-col items-center gap-4">
              {renderRecordingButton()}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevPassage}
              disabled={currentPassageIndex === 0}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              ← Previous
            </button>

            {currentPassageIndex < passages.length - 1 ? (
              <button
                onClick={handleNextPassage}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={canFinishAll}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white rounded-xl font-bold hover:shadow-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {canFinishAll ? (
                  <>
                    <CheckCircle size={20} />
                    Finish Test
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Submit All Recordings
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
