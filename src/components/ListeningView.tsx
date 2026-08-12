import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Volume2, Play, CheckCircle, AlertCircle, BookOpenText, PlayCircle } from 'lucide-react';
import { Passage } from '../data/vstepReadingMock';
import { getAudioUrl } from '../lib/supabaseService';

interface ListeningViewProps {
  passages: Passage[];
  currentPassageIndex: number;
  /** Chỉ admin/teacher được phát từng part riêng lẻ; student/guest chỉ nghe chain (chạy liền 3 part) */
  canPlayIndividual?: boolean;
  /** Bật thì tự động phát chain ngay khi vào bài (tận dụng user gesture từ nút Start bên ngoài) */
  autoPlay?: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const ListeningView: React.FC<ListeningViewProps> = ({
  passages,
  currentPassageIndex,
  canPlayIndividual = false,
  autoPlay = false,
}) => {
  const passage = passages[currentPassageIndex];
  const [hasPlayed, setHasPlayed] = useState<Record<number, boolean>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);

  // Trạng thái Play All: phát liền mạch Part 1 -> 2 -> 3 (không tự chuyển tab)
  const [chainPlaying, setChainPlaying] = useState(false);
  const [chainPartIndex, setChainPartIndex] = useState<number | null>(null);
  const [chainProgress, setChainProgress] = useState(0);
  const [chainTime, setChainTime] = useState(0);
  const [chainDuration, setChainDuration] = useState(0);
  const [chainError, setChainError] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const chainAudioRef = useRef<HTMLAudioElement>(null);
  const chainPartRef = useRef<number>(-1);
  const hasPlayedRef = useRef(hasPlayed);
  useEffect(() => {
    hasPlayedRef.current = hasPlayed;
  }, [hasPlayed]);

  const isPlayed = hasPlayed[passage.id];
  const audioSrc = passage.audioUrl ? getAudioUrl(passage.audioUrl) : '';
  const allPlayed = passages.every(p => hasPlayed[p.id]);
  const chainActive = chainPartIndex !== null;

  // Reset state khi passage thay đổi
  useEffect(() => {
    setCurrentTime(0);
    setProgress(0);
    setDuration(0);
    setAudioError(false);
    setIsPlaying(false);
  }, [passage.id]);

  // Phát từng part (chỉ admin/teacher)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setAudioError(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setHasPlayed(prev => ({ ...prev, [passage.id]: true }));
      setProgress(100);
    };

    const handleError = () => {
      setAudioError(true);
      setIsPlaying(false);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => {
      if (!audio.ended) {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [passage.id]);

  const handlePlay = useCallback(() => {
    if (isPlayed || !audioRef.current || !audioSrc) return;
    audioRef.current.play().catch(() => {
      // Autoplay may be blocked; do nothing
    });
  }, [isPlayed, audioSrc]);

  // Play All: phát liền mạch
  const playChainPart = useCallback((index: number) => {
    const p = passages[index];
    const audio = chainAudioRef.current;
    if (!audio || !p?.audioUrl) return;
    chainPartRef.current = index;
    setChainPartIndex(index);
    setChainPlaying(true);
    setChainTime(0);
    setChainProgress(0);
    setChainDuration(0);
    setChainError(false);
    audio.src = getAudioUrl(p.audioUrl);
    audio.play().catch(() => {
      setChainError(true);
      chainPartRef.current = -1;
      setChainPartIndex(null);
      setChainPlaying(false);
    });
  }, [passages]);

  const handleChainEnded = useCallback(() => {
    const doneIndex = chainPartRef.current;
    if (doneIndex >= 0) {
      setHasPlayed(prev => ({ ...prev, [passages[doneIndex].id]: true }));
    }
    // Tìm part kế tiếp có audio (bỏ qua part không có file)
    let nextIndex = doneIndex + 1;
    while (nextIndex < passages.length && !passages[nextIndex]?.audioUrl) nextIndex++;
    if (nextIndex < passages.length) {
      playChainPart(nextIndex);
    } else {
      chainPartRef.current = -1;
      setChainPartIndex(null);
      setChainPlaying(false);
      setChainProgress(0);
    }
  }, [passages, playChainPart]);

  useEffect(() => {
    const audio = chainAudioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setChainTime(audio.currentTime);
      if (audio.duration) setChainProgress((audio.currentTime / audio.duration) * 100);
    };
    const handleLoadedMetadata = () => {
      setChainDuration(audio.duration);
      setChainError(false);
    };
    const handleError = () => {
      setChainError(true);
      chainPartRef.current = -1;
      setChainPartIndex(null);
      setChainPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleChainEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleChainEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [handleChainEnded]);

  const startChain = useCallback(() => {
    if (chainActive || chainPlaying) return;
    const firstUnplayed = passages.findIndex(p => !hasPlayedRef.current[p.id] && p.audioUrl);
    if (firstUnplayed === -1) return;
    playChainPart(firstUnplayed);
  }, [chainActive, chainPlaying, passages, playChainPart]);

  // Auto-play khi vào bài: phát chain ngay lập tức, chỉ 1 lần mỗi lần mount
  const autoPlayFiredRef = useRef(false);
  useEffect(() => {
    if (autoPlay && !autoPlayFiredRef.current) {
      autoPlayFiredRef.current = true;
      startChain();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  const displayTitle = chainActive && chainPartIndex !== null
    ? `Part ${chainPartIndex + 1}/${passages.length} — ${passages[chainPartIndex]?.title || ''}`
    : passage.title;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6">
        <div className="max-w-3xl mx-auto">
          {/* Hidden <audio> elements */}
          {audioSrc && (
            <audio
              ref={audioRef}
              src={audioSrc}
              preload="metadata"
            />
          )}
          <audio ref={chainAudioRef} preload="metadata" />

          {/* Audio Player */}
          <div className={`bg-gradient-to-r ${
            allPlayed ? 'from-green-500 to-green-600' : 'from-indigo-600 to-purple-600'
          } rounded-2xl shadow-xl p-4 md:p-6 mb-4 md:mb-8 text-white`}>
            <div className="flex items-center gap-3 md:gap-4 mb-4">
              <div className="p-2 md:p-3 bg-white/20 rounded-full flex-shrink-0">
                <Volume2 size={20} className="md:size-[28px]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm md:text-lg break-words leading-snug">{displayTitle}</h3>
                <p className="text-indigo-200 text-xs md:text-sm">
                  {chainError ? (
                    'Audio unavailable'
                  ) : allPlayed ? (
                    'All audio completed. Answer the questions below.'
                  ) : chainActive ? (
                    chainPlaying
                      ? `Playing Part ${(chainPartIndex ?? 0) + 1}/${passages.length}...`
                      : 'Ready'
                  ) : audioError ? (
                    'Audio unavailable'
                  ) : isPlayed ? (
                    'Audio completed. Answer the questions below.'
                  ) : isPlaying ? (
                    'Playing...'
                  ) : !audioSrc ? (
                    'No audio available'
                  ) : (
                    'Press Start Listening to play all parts once'
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                {/* Status phát: autoplay đã chạy khi vào bài nên không cần bấm; còn click chỉ là fallback nếu autoplay bị chặn */}
                <div
                  role="button"
                  aria-disabled={chainActive || allPlayed}
                  onClick={chainActive || allPlayed ? undefined : startChain}
                  className={`flex items-center justify-center gap-1 md:gap-2 px-3 md:px-5 py-2 md:py-3 rounded-xl font-semibold text-xs md:text-sm shadow-lg min-h-[44px] select-none ${
                    chainActive
                      ? 'bg-white text-indigo-700'
                      : allPlayed
                        ? 'bg-white/20 text-white/60'
                        : 'bg-white text-indigo-700 hover:bg-indigo-50 hover:scale-105 cursor-pointer'
                  }`}
                >
                  {chainActive ? (
                    chainPlaying ? (
                      <><span className="animate-pulse">●</span> <span className="hidden md:inline">Playing...</span></>
                    ) : (
                      <><CheckCircle size={16} /> <span className="hidden md:inline">Played</span></>
                    )
                  ) : allPlayed ? (
                    <><CheckCircle size={16} className="md:size-[18px]" /> <span className="hidden md:inline">Played All</span></>
                  ) : (
                    <><PlayCircle size={16} className="md:size-[18px]" /> <span className="hidden md:inline">Start Listening</span></>
                  )}
                </div>

                {/* Play từng part: chỉ admin/teacher */}
                {canPlayIndividual && (
                  <button
                    onClick={handlePlay}
                    disabled={isPlayed || isPlaying || !audioSrc || audioError}
                    className={`flex items-center justify-center gap-1 md:gap-2 px-3 md:px-5 py-2 md:py-3 rounded-xl font-semibold text-xs md:text-sm transition-all shadow-lg min-h-[44px] ${
                      isPlayed
                        ? 'bg-white/20 text-white/50 cursor-not-allowed'
                        : isPlaying
                          ? 'bg-white/20 text-white/70 cursor-default'
                          : 'bg-white text-indigo-700 hover:bg-indigo-50 hover:scale-105'
                    }`}
                  >
                    {isPlayed ? (
                      <><CheckCircle size={16} className="md:size-[18px]" /> <span className="hidden md:inline">Played</span></>
                    ) : isPlaying ? (
                      <><span className="animate-pulse">●</span> <span className="hidden md:inline">Playing...</span></>
                    ) : (
                      <><Play size={16} className="md:size-[18px]" /> <span className="hidden md:inline">Play Once</span></>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden mb-2">
              <div
                className="h-full bg-white rounded-full transition-all duration-200 ease-linear"
                style={{ width: `${chainActive ? chainProgress : progress}%` }}
              />
            </div>

            {/* Time Display */}
            <div className="flex items-center justify-between text-indigo-200 text-xs">
              <span>{formatTime(chainActive ? chainTime : currentTime)}</span>
              <span>{formatTime(chainActive ? chainDuration : duration)}</span>
            </div>

            {chainActive && chainPartIndex !== null && (
              <div className="mt-3 flex items-center gap-2 text-indigo-200 text-sm">
                <AlertCircle size={14} />
                <span>
                  {chainPlaying
                    ? `Đang phát Part ${chainPartIndex + 1}/${passages.length}. Bạn có thể qua lại các part để trả lời câu hỏi bất kỳ lúc nào.`
                    : 'Đã phát xong toàn bộ bài nghe.'}
                </span>
              </div>
            )}

            {!chainActive && isPlayed && (
              <div className="mt-3 flex items-center gap-2 text-green-200 text-sm">
                <AlertCircle size={14} />
                <span>You have listened to this audio. It cannot be replayed.</span>
              </div>
            )}

            {(chainError || audioError) && (
              <div className="mt-3 flex items-center gap-2 text-red-200 text-sm">
                <AlertCircle size={14} />
                <span>Failed to load audio. Please try again later.</span>
              </div>
            )}
          </div>

          {/* Hướng dẫn làm bài + content passage */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg dark:shadow-gray-900/30 p-4 md:p-6">
            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
              <BookOpenText size={18} className="text-indigo-600 flex-shrink-0" />
              <h4 className="text-sm md:text-base font-semibold text-indigo-900 dark:text-gray-100">
                Instruction
              </h4>
            </div>
            {passage.passageText && passage.passageText.trim() ? (
              <div
                className="prose prose-sm md:prose-base max-w-none text-gray-700 dark:text-gray-300 leading-relaxed [&_p]:my-2 [&_span]:my-1"
                dangerouslySetInnerHTML={{ __html: passage.passageText }}
              />
            ) : (
              <div className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                Press Start Listening to play all parts continuously. After listening, answer the questions on the right panel. Audio can only be played once.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
