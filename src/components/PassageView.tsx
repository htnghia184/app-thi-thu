import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { Highlight, HighlightColor, applyHighlightsToDom, HIGHLIGHT_COLOR_OPTIONS } from '../hooks/useHighlighter';
import { Highlighter, Palette, Trash2, Timer } from 'lucide-react';
import { passageToHtml } from '../utils/passageHtml';

interface PassageViewProps {
  title: string;
  passageText: string;
  passageId: number;
  highlights: Highlight[];
  isHighlightMode: boolean;
  activeColor: HighlightColor;
  onToggleHighlightMode: () => void;
  onSetActiveColor: (color: HighlightColor) => void;
  onAddHighlight: (passageId: number, startOffset: number, endOffset: number, text: string) => void;
  onRemoveHighlight: (id: string) => void;
  onClearHighlights: (passageId: number) => void;
  showTimerToggle?: boolean;
  onToggleTimer?: () => void;
  timerSlot?: React.ReactNode;
}

export const PassageView: React.FC<PassageViewProps> = ({
  title,
  passageText,
  passageId,
  highlights,
  isHighlightMode,
  activeColor,
  onToggleHighlightMode,
  onSetActiveColor,
  onAddHighlight,
  onRemoveHighlight,
  onClearHighlights,
  showTimerToggle,
  onToggleTimer,
  timerSlot,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | undefined>(undefined);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [floatPos, setFloatPos] = useState({ x: 0, y: 0, above: true });

  const passageHighlights = useMemo(
    () => highlights.filter(h => h.passageId === passageId),
    [highlights, passageId]
  );

  // Render passage HTML + re-apply highlight spans whenever content or highlights change
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = passageToHtml(passageText);
    applyHighlightsToDom(container, passageHighlights);
  }, [passageText, passageHighlights]);

  // Process the current text selection: show the color picker near the selection
  const processSelection = useCallback(() => {
    if (!isHighlightMode) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      // Collapsed selection: hide the picker, but give the picker buttons time to receive clicks
      hideTimerRef.current = window.setTimeout(() => setShowColorPicker(false), 250);
      return;
    }

    const text = selection.toString().trim();
    if (text.length === 0) return;

    const range = selection.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) return;

    // Calculate offsets relative to the text content
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(container);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preCaretRange.toString().length;
    const endOffset = startOffset + text.length;

    // Position the picker near the selection (kept inside the container on small screens)
    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const relativeTop = rect.top - containerRect.top;
    const popupHeight = 60;
    const above = relativeTop > popupHeight;

    const centerX = rect.left - containerRect.left + rect.width / 2;
    const maxX = Math.max(140, containerRect.width - 70);

    setFloatPos({
      x: Math.max(70, Math.min(centerX, maxX)),
      y: above ? relativeTop - 10 : rect.bottom - containerRect.top + 10,
      above,
    });
    setShowColorPicker(true);

    // Store the offsets for when user picks a color
    (window as any).__highlightData = { passageId, startOffset, endOffset, text };
  }, [isHighlightMode, passageId]);

  // Works for both mouse and touch: selectionchange covers the whole interaction
  useEffect(() => {
    document.addEventListener('selectionchange', processSelection);
    return () => {
      document.removeEventListener('selectionchange', processSelection);
      window.clearTimeout(hideTimerRef.current);
    };
  }, [processSelection]);

  const applyHighlight = useCallback((color: HighlightColor) => {
    window.clearTimeout(hideTimerRef.current);
    const data = (window as any).__highlightData;
    if (data) {
      onSetActiveColor(color);
      onAddHighlight(data.passageId, data.startOffset, data.endOffset, data.text);
    }
    setShowColorPicker(false);
    (window as any).__highlightData = null;
  }, [onAddHighlight, onSetActiveColor]);

  // Handle clicking on an existing highlight to remove it
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const highlightEl = target.closest('[data-highlight-id]') as HTMLElement | null;
    if (highlightEl && highlightEl.dataset.highlightId) {
      onRemoveHighlight(highlightEl.dataset.highlightId);
    }
  }, [onRemoveHighlight]);

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-gray-800 p-4 md:p-8 border-r border-gray-200 dark:border-gray-700 relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
        <h1 className="text-lg md:text-2xl font-bold text-indigo-900 dark:text-gray-100 truncate">{title}</h1>
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={onToggleHighlightMode}
            className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-sm ${
              isHighlightMode
                ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Toggle Highlight Mode"
          >
            <Highlighter size={18} />
            <span className="hidden md:inline">{isHighlightMode ? 'ON' : 'OFF'}</span>
          </button>
          {isHighlightMode && (
            <>
              <button
                onClick={() => {
                  window.clearTimeout(hideTimerRef.current);
                  setShowColorPicker(!showColorPicker);
                }}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                title="Change Highlight Color"
              >
                <Palette size={18} />
              </button>
              {passageHighlights.length > 0 && (
                <button
                  onClick={() => onClearHighlights(passageId)}
                  className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                  title="Clear All Highlights"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </>
          )}
          {showTimerToggle && (
            <button
              onClick={onToggleTimer}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
              title="Toggle Per-Passage Timer"
            >
              <Timer size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Timer slot */}
      {timerSlot}

      {/* Color picker popover */}
      {showColorPicker && (
        <div
          className="absolute z-50 bg-white dark:bg-gray-700 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-600 p-2 flex gap-1.5"
          style={{
            left: floatPos.x,
            top: floatPos.y,
            transform: floatPos.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
          }}
        >
          {HIGHLIGHT_COLOR_OPTIONS.map(opt => (
            <button
              key={opt.color}
              onClick={() => applyHighlight(opt.color)}
              className={`w-9 h-9 md:w-8 md:h-8 rounded-lg ${opt.class} border-2 transition-all ${
                activeColor === opt.color ? 'border-indigo-600 scale-110' : 'border-transparent hover:scale-105'
              }`}
              title={opt.label}
            />
          ))}
        </div>
      )}

      {/* Passage text with highlights */}
      <div
        ref={containerRef}
        className={`passage-content text-sm md:text-base text-gray-800 dark:text-gray-200 leading-relaxed ${isHighlightMode ? 'cursor-text select-text' : 'select-text'}`}
        onMouseUp={processSelection}
        onTouchEnd={processSelection}
        onClick={handleContainerClick}
      />

      {isHighlightMode && (
        <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
          <Highlighter size={14} />
          Highlight mode is ON. Select any text to highlight it. Tap a highlight to remove it.
        </div>
      )}
    </div>
  );
};
