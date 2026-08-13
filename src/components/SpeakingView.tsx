import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Passage } from '../data/vstepReadingMock';
import { uploadSpeakingAudio, uploadGuestSpeakingAudio, submitSpeakingSubmission } from '../lib/supabaseService';
import { passageToHtml } from '../utils/passageHtml';
import {
  Mic, Square, Loader2, CheckCircle, AlertCircle,
  Headphones, Trash2, Save, BookOpen, Timer
} from 'lucide-react';

interface SpeakingViewProps {
  passages: Passage[];
  userId?: string;
  examId?: string;
  /** Tên & mô tả đề thi — hiển thị ở màn hình giới thiệu trước khi bắt đầu */
  examTitle?: string;
  examDescription?: string;
  onSpeakingSubmit?: () => void;
  /** Guest không có tài khoản: báo App mỗi khi upload xong 1 audio để lưu vào exam_leads */
  onGuestAudioUploaded?: (
    passageNumber: number,
    passageTitle: string,
    audioUrl: string,
    durationSeconds: number
  ) => void;
}

type RecordingState = 'idle' | 'preparing' | 'recording' | 'recorded' | 'uploading' | 'submitted';

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
  examTitle,
  examDescription,
  onSpeakingSubmit,
  onGuestAudioUploaded,
}) => {
  const [currentPassageIndex, setCurrentPassageIndex] = useState(0);
  const [recordings, setRecordings] = useState<Record<number, PassageRecording>>({});
  const [error, setError] = useState<string | null>(null);
  /** Màn hình giới thiệu: chưa bắt đầu thì không hiện passage */
  const [started, setStarted] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);
  const autoStartedRef = useRef(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Preparation phase (đọc đề, chưa ghi âm)
  const [prepRemaining, setPrepRemaining] = useState(60);
  const prepTimerRef = useRef<number | null>(null);
  const prepTransitioningRef = useRef(false);
  // Beep + banner "Bắt đầu nói!" khi chuyển sang recording
  const [showSpeakBanner, setShowSpeakBanner] = useState(false);
  const bannerTimeoutRef = useRef<number | null>(null);
  // Audio level meter (waveform theo tiếng nói) — vẽ trực tiếp lên canvas, không đè React re-render
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  const currentPassage = passages[currentPassageIndex];
  const currentRecording = recordings[currentPassage?.id];
  const recState = currentRecording?.state || 'idle';

  // Auto mode: phần có durationSeconds → hết giờ tự dừng, tự upload, tự chuyển & tự bật record
  const isAutoMode = !!currentPassage?.durationSeconds && currentPassage.durationSeconds > 0;
  const remainingSeconds = isAutoMode
    ? Math.max(0, (currentPassage?.durationSeconds || 0) - recordingSeconds)
    : null;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
      stopLevelMeter();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Beep ngắn báo hiệu bắt đầu nói (không bắt buộc — nếu browser chặn thì bỏ qua)
  const playBeep = () => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
      osc.onended = () => void ctx.close();
    } catch {
      // ignore
    }
  };

  // Vẽ equalizer lên canvas theo dữ liệu tần số thực từ micro (mỗi frame, không qua React state)
  const drawWaveform = (time: number) => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    if (!W || !H) return;
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    let peak = 0;
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, data[i] / 255);
    const active = peak > 0.06;

    const barW = 4;
    const gap = 2;
    const total = barW + gap;
    const n = Math.floor(W / total);

    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    if (active) {
      gradient.addColorStop(0, '#f43f5e');
      gradient.addColorStop(0.6, '#ec4899');
      gradient.addColorStop(1, '#fb7185');
    } else {
      gradient.addColorStop(0, 'rgba(244,63,94,0.4)');
      gradient.addColorStop(1, 'rgba(251,113,133,0.4)');
    }
    ctx.fillStyle = gradient;

    for (let i = 0; i < n; i++) {
      // Quét dải tần, bỏ vài bin thấp nhất để tránh nhiễu nền
      const idx = Math.min(data.length - 1, Math.floor((i / n) * data.length * 0.9) + 2);
      const level = data[idx] / 255;
      // Seed ổn định theo cột → mỗi cột có dáng riêng, không thành hình tam giác
      const seed = ((i * 73) % 17) / 17;
      let h: number;
      if (active) {
        h = Math.max(0.08, level * (0.5 + seed * 0.7));
      } else {
        // Idle: từng cột nhún nhẹ theo sóng sin như equalizer trang nhạc
        h = 0.13 + seed * 0.2 + Math.sin(time / 320 + i * 0.35) * 0.07;
      }
      const bh = Math.max(3, Math.min(H, h * H));
      const x = i * total + 2;
      const y = (H - bh) / 2;
      ctx.beginPath();
      const r = barW / 2;
      if (typeof (ctx as any).roundRect === 'function') (ctx as any).roundRect(x, y, barW, bh, r);
      else ctx.rect(x, y, barW, bh);
      ctx.fill();
    }
  };

  // Waveform theo âm lượng thực tế từ stream micro
  const startLevelMeter = (stream: MediaStream) => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const tick = (time: number) => {
        drawWaveform(time);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // ignore — không có waveform thì thôi
    }
  };

  const stopLevelMeter = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      const cctx = canvas.getContext('2d');
      if (cctx) cctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const advanceAfterRecording = (passageId: number) => {
    const idx = passages.findIndex(p => p.id === passageId);
    const nextIdx = idx + 1;
    if (nextIdx < passages.length) {
      setCurrentPassageIndex(nextIdx);
      setError(null);
      // Tự bật record phần tiếp theo
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        startRecordingRef.current(passages[nextIdx].id);
      }, 400);
    } else {
      // Hết passage cuối → tự kết thúc bài thi
      if (onSpeakingSubmit) onSpeakingSubmit();
    }
  };

  const handleRecordingComplete = async (
    passageId: number,
    title: string,
    blob: Blob,
    elapsed: number,
    auto: boolean
  ) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecordingSeconds(0);
    stopLevelMeter();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    const url = URL.createObjectURL(blob);

    // Manual mode (không có durationSeconds): lưu lại, người dùng tự bấm submit
    if (!auto) {
      setRecordings(prev => ({
        ...prev,
        [passageId]: {
          passageId,
          state: 'recorded',
          audioBlob: blob,
          audioUrl: url,
          durationSeconds: elapsed,
        },
      }));
      return;
    }

    // Auto mode: upload rồi tự chuyển passage kế tiếp
    setRecordings(prev => ({
      ...prev,
      [passageId]: {
        passageId,
        state: 'uploading',
        audioBlob: blob,
        audioUrl: url,
        durationSeconds: elapsed,
      },
    }));

    if (!examId) {
      // Không có exam — không thể lưu: chỉ đánh dấu submitted rồi chuyển tiếp
      setRecordings(prev => ({
        ...prev,
        [passageId]: { ...prev[passageId], state: 'submitted' },
      }));
      advanceAfterRecording(passageId);
      return;
    }

    if (!userId) {
      // GUEST (không tài khoản): upload audio lên storage, App lưu URL
      // để gắn vào exam_leads khi guest để lại thông tin liên hệ.
      try {
        const passageIndex = passages.findIndex(p => p.id === passageId);
        const audioUrl = await uploadGuestSpeakingAudio(blob, examId, passageIndex + 1);
        onGuestAudioUploaded?.(passageIndex + 1, title, audioUrl, elapsed);
        setRecordings(prev => ({
          ...prev,
          [passageId]: { ...prev[passageId], state: 'submitted' },
        }));
      } catch (err: any) {
        setError(err.message || 'Failed to upload recording');
        setRecordings(prev => ({
          ...prev,
          [passageId]: { ...prev[passageId], state: 'recorded' },
        }));
      }
      advanceAfterRecording(passageId);
      return;
    }

    try {
      const audioUrl = await uploadSpeakingAudio(blob, userId, examId, passageId);
      const passageIndex = passages.findIndex(p => p.id === passageId);
      const submission = await submitSpeakingSubmission(
        userId,
        examId,
        passageIndex + 1,
        title,
        audioUrl,
        elapsed
      );
      setRecordings(prev => ({
        ...prev,
        [passageId]: { ...prev[passageId], state: 'submitted', submissionId: submission.id },
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to submit recording');
      setRecordings(prev => ({
        ...prev,
        [passageId]: { ...prev[passageId], state: 'recorded' },
      }));
    }
    advanceAfterRecording(passageId);
  };

  // Preparation phase: hiển thị đề + đếm ngược đọc đề (chưa ghi âm, mic khóa)
  const startPreparation = (passageId: number) => {
    const passage = passages.find(p => p.id === passageId);
    if (!passage) return;
    setError(null);
    prepTransitioningRef.current = false;
    const prepSecs = passage.prepSeconds && passage.prepSeconds > 0 ? passage.prepSeconds : 60;
    setPrepRemaining(prepSecs);
    setRecordings(prev => ({
      ...prev,
      [passageId]: {
        passageId,
        state: 'preparing',
        audioBlob: null,
        audioUrl: null,
        durationSeconds: 0,
      },
    }));
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    prepTimerRef.current = window.setInterval(() => {
      setPrepRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
  };

  const startRecordingImpl = async (passageId: number) => {
    setError(null);
    const passage = passages.find(p => p.id === passageId);
    if (!passage) return;
    const auto = !!passage.durationSeconds && passage.durationSeconds > 0;

    try {
      const stream = await getMediaStream();
      streamRef.current = stream;
      startLevelMeter(stream);

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
        const elapsed = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
        void handleRecordingComplete(passageId, passage.title, blob, elapsed, auto);
      };

      // Start recording
      startTimeRef.current = Date.now();
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 500);

      mediaRecorder.start();
      // Hiệu lệnh "Bắt đầu nói!" chỉ dùng ở auto mode (có giới hạn thời gian)
      if (auto) {
        playBeep();
        setShowSpeakBanner(true);
        if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
        bannerTimeoutRef.current = window.setTimeout(() => setShowSpeakBanner(false), 3000);
      }
      setRecordings(prev => ({
        ...prev,
        [passageId]: {
          passageId,
          state: 'recording',
          audioBlob: null,
          audioUrl: null,
          durationSeconds: 0,
        },
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to start recording');
      setRecordings(prev => {
        const next = { ...prev };
        delete next[passageId];
        return next;
      });
    }
  };

  const startRecording = useCallback(
    (passageId?: number) => {
      const pid = passageId ?? currentPassage?.id;
      if (pid === undefined) return;
      const passage = passages.find(p => p.id === pid);
      if (passage?.durationSeconds && passage.durationSeconds > 0) {
        // Auto mode: vào preparation trước, hết giờ chuẩn bị sẽ tự bật ghi âm
        startPreparation(pid);
      } else {
        void startRecordingImpl(pid);
      }
    },
    [currentPassage?.id]
  );

  // Luôn giữ tham chiếu mới nhất để dùng trong callback async (advance/auto-start)
  const startRecordingRef = useRef(startRecording);
  startRecordingRef.current = startRecording;

  // Ref riêng để bắt đầu ghi âm thật khi hết thời gian chuẩn bị
  const beginRecordingRef = useRef<(pid: number) => void>(() => {});
  beginRecordingRef.current = (pid: number) => { void startRecordingImpl(pid); };

  // Hết thời gian chuẩn bị → beep + tự bật ghi âm
  useEffect(() => {
    if (recState === 'preparing' && prepRemaining <= 0 && currentPassage) {
      if (prepTransitioningRef.current) return;
      prepTransitioningRef.current = true;
      if (prepTimerRef.current) { clearInterval(prepTimerRef.current); prepTimerRef.current = null; }
      beginRecordingRef.current(currentPassage.id);
    }
  }, [prepRemaining, recState, currentPassage]);

  // Tự bật record phần đầu tiên (chỉ sau khi bấm "Bắt đầu" ở màn giới thiệu)
  useEffect(() => {
    if (!started || !passages.length || autoStartedRef.current) return;
    const first = passages[0];
    if (first.durationSeconds && first.durationSeconds > 0) {
      autoStartedRef.current = true;
      timeoutRef.current = window.setTimeout(() => {
        startRecordingRef.current(first.id);
      }, 600);
    }
  }, [started, passages]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Hết thời lượng → tự dừng ghi âm
  useEffect(() => {
    if (recState === 'recording' && isAutoMode && (remainingSeconds ?? 0) <= 0) {
      stopRecording();
    }
  }, [recordingSeconds, recState, isAutoMode, remainingSeconds, stopRecording]);

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
        currentPassageIndex + 1,
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

  // Tự động kết thúc khi tất cả các phần đã submit xong
  useEffect(() => {
    if (canFinishAll && passages.length > 0) {
      const t = setTimeout(() => {
        if (onSpeakingSubmit) onSpeakingSubmit();
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [canFinishAll, passages.length, onSpeakingSubmit]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const renderWaveform = () => (
    <canvas
      ref={canvasRef}
      className="block w-full max-w-2xl h-20 md:h-24 mx-auto"
    />
  );

  const renderRecordingButton = () => {
    switch (recState) {
      case 'idle':
        return (
          <div className="text-center space-y-3 w-full">
            <button
              onClick={() => startRecording()}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-red-500 to-red-700 text-white rounded-2xl font-bold text-lg hover:shadow-xl transition-all shadow-lg hover:scale-105 mx-auto"
            >
              <Mic size={24} />
              Start Recording
            </button>
            {isAutoMode && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Bấm để bắt đầu — vào phần chuẩn bị đọc đề rồi tự ghi âm.
              </p>
            )}
          </div>
        );
      case 'preparing':
        return (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Timer size={26} className="text-indigo-500" />
              <span className="text-4xl font-mono font-bold text-indigo-600">
                {formatDuration(prepRemaining)}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Thời gian chuẩn bị — đọc đề & gạch ý chính
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Ghi âm sẽ tự bật khi hết giờ chuẩn bị
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-gray-400">
              <Mic size={18} className="opacity-40" />
              <span className="text-sm">Micro bị khóa trong lúc chuẩn bị</span>
            </div>
          </div>
        );
      case 'recording':
        return (
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
              {isAutoMode ? (
                <div className="flex items-center gap-2">
                  <Timer size={22} className="text-red-500" />
                  <span className={`text-3xl font-mono font-bold ${(remainingSeconds ?? 0) <= 10 ? 'text-red-600 animate-pulse' : 'text-red-600'}`}>
                    {formatDuration(remainingSeconds ?? 0)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">remaining</span>
                </div>
              ) : (
                <span className="text-2xl font-mono font-bold text-red-600">
                  {formatDuration(recordingSeconds)}
                </span>
              )}
            </div>
            {renderWaveform()}
            <button
              onClick={stopRecording}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-2xl font-bold text-lg hover:shadow-xl transition-all shadow-lg mx-auto"
            >
              <Square size={24} />
              Stop Recording
            </button>
            {isAutoMode && (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Hết thời lượng sẽ tự dừng, tự lưu và chuyển sang phần tiếp theo.
              </p>
            )}
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

  // Màn hình giới thiệu: xem mô tả đề, bấm "Bắt đầu" mới vào phase prep + hiện passage 1
  if (!started) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-red-50 to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 md:px-8">
        <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/30 overflow-hidden">
          <div className="bg-gradient-to-r from-rose-600 to-pink-700 px-6 md:px-10 py-6 text-white">
            <div className="flex items-center gap-3">
              <Headphones size={28} />
              <h2 className="text-xl md:text-2xl font-bold">Speaking Section</h2>
            </div>
            <p className="text-rose-100 text-sm md:text-base mt-1">{examTitle}</p>
          </div>
          <div className="p-6 md:p-10">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {examDescription || 'Phần thi Speaking gồm nhiều phần. Mỗi phần có thời gian chuẩn bị để đọc đề, sau đó ghi âm câu trả lời của bạn.'}
            </p>
            <div className="mt-6 space-y-3">
              {passages.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800">
                  <span className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{p.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {p.durationSeconds ? `${p.durationSeconds}s nói` : ''}
                      {p.durationSeconds && p.prepSeconds ? ' · ' : ''}
                      {p.prepSeconds ? `${p.prepSeconds}s chuẩn bị` : ''}
                      {!p.durationSeconds && !p.prepSeconds ? 'Ghi âm tự do' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStarted(true)}
              className="mt-8 w-full py-3.5 bg-gradient-to-r from-rose-600 to-pink-700 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Mic size={22} />
              Bắt đầu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-600 to-pink-700 text-white px-4 md:px-8 py-3 md:py-4">
        <div className="flex items-center gap-2 md:gap-3">
          <Headphones size={20} className="md:size-[24px]" />
          <div>
            <h2 className="text-sm md:text-lg font-bold">Speaking Section</h2>
            <p className="text-xs md:text-sm text-rose-200">
              Part {currentPassageIndex + 1} of {passages.length}
              {isAutoMode && currentPassage.durationSeconds
                ? ` · ${currentPassage.durationSeconds}s nói`
                : ''}
            </p>
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
                  <h3 className="font-bold text-sm md:text-lg break-words leading-snug">{currentPassage.title}</h3>
                </div>
                {isAutoMode && currentPassage.durationSeconds && (
                  <p className="text-rose-200 text-xs md:text-sm mt-1 flex items-center gap-1">
                    <Timer size={12} />
                    {currentPassage.durationSeconds}s nói
                    {currentPassage.prepSeconds ? ` · ${currentPassage.prepSeconds}s chuẩn bị` : ''}
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-900/30 p-6 md:p-8 relative overflow-hidden">
            <div className="flex flex-col items-center gap-4">
              {renderRecordingButton()}
            </div>
            {/* Hiệu lệnh chuyển tiếp: "Bắt đầu nói!" */}
            {showSpeakBanner && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-r from-red-600/95 to-pink-600/95 animate-pulse">
                <div className="text-center text-white">
                  <Mic size={52} className="mx-auto mb-2" />
                  <p className="text-2xl md:text-3xl font-black tracking-widest">BẮT ĐẦU NÓI!</p>
                  <p className="text-xs text-red-100 mt-1">Recorder đang chạy…</p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation (chỉ hiện ở chế độ ghi âm tự do) */}
          {!isAutoMode && (
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
                  onClick={() => { if (onSpeakingSubmit) onSpeakingSubmit(); }}
                  disabled={!canFinishAll}
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
                      Complete all parts to finish
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};