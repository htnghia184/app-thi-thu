import React from 'react';
import { SKILL_CONFIG } from '../lib/constants';

interface ExamHeaderProps {
  examTitle: string;
  skillType: string;
  minutes: number;
  seconds: number;
  currentPassageIndex: number;
  totalPassages: number;
  onSelectPassage: (index: number) => void;
  onSubmitClick: () => void;
  onBackToDashboard: () => void;
  /** Chặn nút Back khi đang thi nghiêm ngặt (chỉ back được sau khi nộp bài) */
  disableBack?: boolean;
  bookmarkedCount?: number;
}

export const ExamHeader: React.FC<ExamHeaderProps> = ({
  examTitle,
  skillType,
  minutes,
  seconds,
  currentPassageIndex,
  totalPassages,
  onSelectPassage,
  onSubmitClick,
  onBackToDashboard,
  disableBack,
  bookmarkedCount,
}) => {
  const isUrgent = minutes === 0 && seconds <= 60;
  const formatTime = (m: number, s: number) => `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const config = SKILL_CONFIG[skillType] || { label: 'Exam', color: 'from-indigo-500 to-indigo-700', icon: null as any };
  const SkillIcon = config.icon;

  return (
    <header className={`bg-gradient-to-r ${config.color} text-white shadow-lg z-50 sticky top-0`}>
      <div className="flex items-center justify-between px-4 py-3 md:px-8 md:py-4 border-b border-white/20">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <button
            onClick={onBackToDashboard}
            disabled={disableBack}
            title={disableBack ? 'Nộp bài xong mới được quay lại' : 'Back'}
            className={`text-sm transition-colors mr-1 md:mr-2 flex-shrink-0 ${
              disableBack ? 'text-white/25 cursor-not-allowed' : 'text-white/70 hover:text-white'
            }`}
          >
            ← <span className="hidden md:inline">Back</span>
          </button>
          {SkillIcon && <SkillIcon size={20} className="flex-shrink-0" />}
          <h1 className="text-sm md:text-xl font-bold truncate min-w-0 flex-1">{examTitle}</h1>
        </div>
        <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
          {bookmarkedCount !== undefined && bookmarkedCount > 0 && (
            <div className="flex items-center gap-1.5 text-amber-200 text-sm font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-amber-200" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              <span className="hidden md:inline">Bookmarked</span>
              <span>{bookmarkedCount}</span>
            </div>
          )}
          <div className="flex flex-col items-end">
            <span className="text-white/70 text-xs uppercase tracking-wider font-semibold hidden md:block">Time Remaining</span>
            <span className={`font-mono font-bold ${isUrgent ? 'text-red-300 animate-pulse' : 'text-white'} ${minutes >= 100 ? 'text-lg md:text-xl' : 'text-xl md:text-2xl'}`}>{formatTime(minutes, seconds)}</span>
          </div>
          <button onClick={onSubmitClick} className="flex items-center gap-2 px-3 md:px-6 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg shadow-md transition-all min-h-[44px]">
            <span className="font-semibold hidden md:inline">Submit Test</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </button>
        </div>
      </div>
      {skillType !== 'writing' && skillType !== 'speaking' && totalPassages > 0 && (
        <div className="flex items-center gap-2 px-4 md:px-8 py-3 bg-black/10 overflow-x-auto">
          {Array.from({ length: totalPassages }, (_, i) => (
            <button key={i} onClick={() => onSelectPassage(i)}
              className={`px-3 md:px-4 py-2 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap ${currentPassageIndex === i ? 'bg-white text-gray-900' : 'bg-transparent text-white/80 hover:bg-white/10'}`}
            >
              {skillType === 'listening' ? `Part ${i + 1}` : `Passage ${i + 1}`}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
