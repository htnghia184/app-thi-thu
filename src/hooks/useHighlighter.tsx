import { useState, useCallback, useEffect } from 'react';

export type HighlightColor = 'yellow' | 'blue' | 'green' | 'pink';

export interface Highlight {
  id: string;
  passageId: number;
  startOffset: number;
  endOffset: number;
  color: HighlightColor;
  text: string;
}

const HIGHLIGHT_CLASSES: Record<HighlightColor, string> = {
  yellow: 'bg-yellow-200',
  blue: 'bg-blue-200',
  green: 'bg-green-200',
  pink: 'bg-pink-200',
};

const STORAGE_KEY = 'vstep_highlights';

function loadHighlights(): Highlight[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function useHighlighter() {
  const [highlights, setHighlights] = useState<Highlight[]>(loadHighlights);
  const [activeColor, setActiveColor] = useState<HighlightColor>('yellow');
  const [isHighlightMode, setIsHighlightMode] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(highlights));
  }, [highlights]);

  const addHighlight = useCallback(
    (passageId: number, startOffset: number, endOffset: number, text: string) => {
      if (startOffset >= endOffset || text.trim().length === 0) return;
      setHighlights(prev => [
        ...prev,
        {
          id: `${passageId}-${startOffset}-${endOffset}-${Date.now()}`,
          passageId,
          startOffset,
          endOffset,
          color: activeColor,
          text,
        },
      ]);
    },
    [activeColor]
  );

  const removeHighlight = useCallback((highlightId: string) => {
    setHighlights(prev => prev.filter(h => h.id !== highlightId));
  }, []);

  const clearPassageHighlights = useCallback((passageId: number) => {
    setHighlights(prev => prev.filter(h => h.passageId !== passageId));
  }, []);

  const getPassageHighlights = useCallback(
    (passageId: number) => {
      return highlights
        .filter(h => h.passageId === passageId)
        .sort((a, b) => a.startOffset - b.startOffset);
    },
    [highlights]
  );

  const toggleHighlightMode = useCallback(() => {
    setIsHighlightMode(prev => !prev);
  }, []);

  const getColorClass = useCallback((color: HighlightColor) => {
    return HIGHLIGHT_CLASSES[color];
  }, []);

  return {
    highlights,
    activeColor,
    setActiveColor,
    isHighlightMode,
    toggleHighlightMode,
    addHighlight,
    removeHighlight,
    clearPassageHighlights,
    getPassageHighlights,
    getColorClass,
  };
}

export const HIGHLIGHT_COLOR_OPTIONS: { color: HighlightColor; label: string; class: string }[] = [
  { color: 'yellow', label: 'Yellow', class: 'bg-yellow-200' },
  { color: 'blue', label: 'Blue', class: 'bg-blue-200' },
  { color: 'green', label: 'Green', class: 'bg-green-200' },
  { color: 'pink', label: 'Pink', class: 'bg-pink-200' },
];

interface HighlightSeg {
  text: string;
  highlight?: { color: HighlightColor; id: string };
}

/**
 * Render text with highlight spans injected at the given offsets.
 */
export function renderHighlightedText(
  text: string,
  highlights: { startOffset: number; endOffset: number; color: HighlightColor; id: string }[]
) {
  if (highlights.length === 0) {
    return <span>{text}</span>;
  }

  const sorted = [...highlights].sort((a, b) => a.startOffset - b.startOffset);
  const segments: HighlightSeg[] = [];
  let lastEnd = 0;

  for (const h of sorted) {
    const start = Math.max(0, Math.min(h.startOffset, text.length));
    const end = Math.max(start, Math.min(h.endOffset, text.length));
    if (start >= end) continue;

    if (start > lastEnd) {
      segments.push({ text: text.slice(lastEnd, start) });
    }
    segments.push({ text: text.slice(start, end), highlight: { color: h.color, id: h.id } });
    lastEnd = end;
  }
  if (lastEnd < text.length) {
    segments.push({ text: text.slice(lastEnd) });
  }

  return (
    <span>
      {segments.map((seg, i) => {
        if (seg.highlight) {
          const cls = HIGHLIGHT_CLASSES[seg.highlight.color] + ' rounded px-0.5 cursor-pointer';
          return (
            <span
              key={seg.highlight.id}
              className={cls}
              data-highlight-id={seg.highlight.id}
            >
              {seg.text}
            </span>
          );
        }
        return <span key={i}>{seg.text}</span>;
      })}
    </span>
  );
}
