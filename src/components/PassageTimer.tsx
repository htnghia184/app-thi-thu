import React, { useCallback, useMemo } from 'react';
import { Clock, Lock, Unlock } from 'lucide-react';

interface PassageTimerProps {
  totalMinutes: number;
  passageCount: number;
  currentPassageIndex: number;
  passageTimes: number[];
  lockedPassages: boolean[];
  onPassageTimeChange: (index: number, newMinutes: number) => void;
  onToggleLock: (index: number) => void;
  passageLabels?: string[];
}

export const PassageTimer: React.FC<PassageTimerProps> = ({
  totalMinutes,
  passageCount,
  currentPassageIndex,
  passageTimes,
  lockedPassages,
  onPassageTimeChange,
  onToggleLock,
  passageLabels,
}) => {
  const defaultPerPassage = Math.floor(totalMinutes / passageCount);

  const totalAllocated = useMemo(
    () => passageTimes.reduce((s, t) => s + t, 0),
    [passageTimes]
  );

  const handleSliderChange = useCallback(
    (index: number, value: number) => {
      if (lockedPassages[index]) return;
      onPassageTimeChange(index, value);
    },
    [lockedPassages, onPassageTimeChange]
  );

  const getTimeStatus = useCallback(
    (minutes: number) => {
      if (minutes <= 0) return 'text-red-500';
      if (minutes < defaultPerPassage * 0.5) return 'text-amber-500';
      return 'text-indigo-700';
    },
    [defaultPerPassage]
  );

  return (
    <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Clock size={16} />
          <span>Per-Passage Time Allocation</span>
        </div>
        <span className="text-xs text-gray-500">
          {totalAllocated} / {totalMinutes} min allocated
        </span>
      </div>

      <div className="space-y-2">
        {Array.from({ length: passageCount }, (_, i) => {
          const time = passageTimes[i] ?? defaultPerPassage;
          const isLocked = lockedPassages[i] ?? false;
          const isCurrent = i === currentPassageIndex;

          return (
            <div
              key={i}
              className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                isCurrent ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-gray-50'
              }`}
            >
              {/* Passage label */}
              <span className="w-20 text-xs font-medium text-gray-600 truncate">
                {passageLabels?.[i] ?? `Passage ${i + 1}`}
              </span>

              {/* Time value */}
              <span className={`w-10 text-sm font-bold text-center ${getTimeStatus(time)}`}>
                {time}m
              </span>

              {/* Slider */}
              <input
                type="range"
                min={1}
                max={Math.max(totalMinutes, 1)}
                value={time}
                onChange={e => handleSliderChange(i, parseInt(e.target.value))}
                className={`flex-1 h-1.5 rounded-full appearance-none cursor-pointer ${
                  isLocked ? 'opacity-50 pointer-events-none' : ''
                }`}
                style={{
                  background: `linear-gradient(to right, #6366f1 ${(time / totalMinutes) * 100}%, #e5e7eb ${(time / totalMinutes) * 100}%)`,
                }}
                disabled={isLocked}
              />

              {/* Lock toggle */}
              <button
                onClick={() => onToggleLock(i)}
                className={`p-1.5 rounded-lg transition-all ${
                  isLocked
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
                title={isLocked ? 'Unlock time' : 'Lock time'}
              >
                {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
              </button>
            </div>
          );
        })}
      </div>

      {totalAllocated !== totalMinutes && (
        <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
          <Clock size={12} />
          Total allocated time ({totalAllocated}m) doesn't match exam duration ({totalMinutes}m).
          {totalAllocated < totalMinutes
            ? ` ${totalMinutes - totalAllocated}m unallocated.`
            : ` ${totalAllocated - totalMinutes}m over.`}
        </p>
      )}
    </div>
  );
};
