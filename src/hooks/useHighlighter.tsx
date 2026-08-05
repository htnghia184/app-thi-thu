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

/**
 * Apply highlight spans into a rendered DOM root at the given text offsets.
 * Works with HTML-rendered content by walking text nodes in document order.
 */
export function applyHighlightsToDom(root: HTMLElement, highlights: Highlight[]) {
  if (!root || highlights.length === 0) return;

  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    textNodes.push(node as Text);
    node = walker.nextNode();
  }

  const total = root.textContent?.length ?? 0;
  const sorted = [...highlights].sort((a, b) => a.startOffset - b.startOffset);

  for (const h of sorted) {
    const start = Math.max(0, Math.min(h.startOffset, total));
    const end = Math.max(start, Math.min(h.endOffset, total));
    if (start >= end) continue;
    wrapTextRange(textNodes, start, end, h);
  }
}

function wrapTextRange(textNodes: Text[], start: number, end: number, h: Highlight) {
  let offset = 0;

  for (const node of textNodes) {
    const len = node.textContent?.length ?? 0;
    const nodeStart = offset;
    const nodeEnd = offset + len;

    if (nodeEnd <= start) {
      offset = nodeEnd;
      continue;
    }
    if (nodeStart >= end) break;

    const cutStart = Math.max(0, start - nodeStart);
    const cutEnd = Math.min(len, end - nodeStart);
    if (cutEnd - cutStart <= 0) {
      offset = nodeEnd;
      continue;
    }

    const parent = node.parentElement;
    if (!parent) {
      offset = nodeEnd;
      continue;
    }

    const before = document.createTextNode(node.textContent!.slice(0, cutStart));
    const mid = document.createTextNode(node.textContent!.slice(cutStart, cutEnd));
    const after = document.createTextNode(node.textContent!.slice(cutEnd));

    const span = document.createElement('span');
    span.className = `${HIGHLIGHT_CLASSES[h.color]} rounded px-0.5 cursor-pointer`;
    span.dataset.highlightId = h.id;
    span.appendChild(mid);

    parent.replaceChild(after, node);
    parent.insertBefore(span, after);
    parent.insertBefore(before, span);

    offset = nodeEnd;
  }
}
