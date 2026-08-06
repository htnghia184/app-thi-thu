import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Volume2, Play, CheckCircle, AlertCircle, Headphones, BookOpenText } from 'lucide-react';
import { Passage } from '../data/vstepReadingMock';
import { getAudioUrl } from '../lib/supabaseService';

interface ListeningViewProps {
  passages: Passage[];
  currentPassageIndex: number;
  onSelectPassage: (index: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const ListeningView: React.FC<ListeningViewProps> = ({
  passages,
  currentPassageIndex,
  onSelectPassage,
}) => {
  const passage = passages[currentPassageIndex];
  const [hasPlayed, setHasPlayed] = useState<Record<number, boolean>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const isPlayed = hasPlayed[passage.id];

  // Resolve audio URL
  const audioSrc = passage.audioUrl ? getAudioUrl(passage.audioUrl) : '';

  // Reset state when passage changes
  useEffect(() => {
    setCurrentTime(0);
    setProgress(0);
    setDuration(0);
    setAudioError(false);
    setIsPlaying(false);
  }, [passage.id]);

  // Attach audio event listeners
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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Passage Tabs */}
      <div className="flex gap-2 px-4 md:px-8 pt-4 md:pt-6 pb-3 bg-indigo-50 dark:bg-gray-900 border-b border-indigo-100 dark:border-gray-700 overflow-x-auto">
        {passages.map((p, i) => (
          <button
            key={p.id}
            onClick={() => onSelectPassage(i)}
            className={`px-5 py-2 rounded-t-lg text-sm font-medium transition-all ${
              currentPassageIndex === i
                ? 'bg-white dark:bg-gray-800 text-indigo-900 dark:text-gray-100 shadow-sm border border-indigo-200 dark:border-gray-600 border-b-white'
                : 'bg-indigo-100/50 dark:bg-gray-800/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Headphones size={14} />
              Part {i + 1}
              {hasPlayed[p.id] && <CheckCircle size={14} className="text-green-500" />}
            </div>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6">
        <div className="max-w-3xl mx-auto">
          {/* Hidden <audio> element */}
          {audioSrc && (
            <audio
              ref={audioRef}
              src={audioSrc}
              preload="metadata"
            />
          )}

          {/* Audio Player */}
          <div className={`bg-gradient-to-r ${
            isPlayed ? 'from-green-500 to-green-600' : 'from-indigo-600 to-purple-600'
          } rounded-2xl shadow-xl p-4 md:p-6 mb-4 md:mb-8 text-white`}>
            <div className="flex items-center gap-3 md:gap-4 mb-4">
              <div className="p-2 md:p-3 bg-white/20 rounded-full flex-shrink-0">
                <Volume2 size={20} className="md:size-[28px]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm md:text-lg break-words leading-snug">{passage.title}</h3>
                <p className="text-indigo-200 text-xs md:text-sm">
                  {audioError ? (
                    'Audio unavailable'
                  ) : isPlayed ? (
                    'Audio completed. Answer the questions below.'
                  ) : isPlaying ? (
                    'Playing...'
                  ) : !audioSrc ? (
                    'No audio available'
                  ) : (
                    'Click play to start listening'
                  )}
                </p>
              </div>
              <button
                onClick={handlePlay}
                disabled={isPlayed || isPlaying || !audioSrc || audioError}
                className={`flex items-center gap-1 md:gap-2 px-3 md:px-6 py-2 md:py-3 rounded-xl font-semibold text-xs md:text-sm transition-all shadow-lg flex-shrink-0 min-h-[44px] ${
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
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden mb-2">
              <div
                className="h-full bg-white rounded-full transition-all duration-200 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Time Display */}
            <div className="flex items-center justify-between text-indigo-200 text-xs">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            {isPlayed && (
              <div className="mt-3 flex items-center gap-2 text-green-200 text-sm">
                <AlertCircle size={14} />
                <span>You have listened to this audio. It cannot be replayed.</span>
              </div>
            )}

            {audioError && (
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
                Click Play to listen to the audio. After listening, answer the questions on the right panel. Each audio can only be played once.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
