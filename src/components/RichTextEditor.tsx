import React, { useRef, useState, useCallback } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, Type, Heading2, Heading3,
  Quote, List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
  Columns2, Columns3, Columns, Eraser, Code2, Eye,
} from 'lucide-react';
import { passageToHtml } from '../utils/passageHtml';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const BLOCK_SELECTOR = 'p,div,h1,h2,h3,h4,h5,h6,li,blockquote,pre';

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showSource, setShowSource] = useState(false);
  const [sourceText, setSourceText] = useState('');

  const sync = useCallback(() => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const exec = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    sync();
  }, [sync]);

  const toggleSource = useCallback(() => {
    if (!showSource) {
      setSourceText(editorRef.current?.innerHTML || '');
      setShowSource(true);
    } else {
      if (editorRef.current) {
        editorRef.current.innerHTML = sourceText || '';
        onChange(sourceText || '');
      }
      setShowSource(false);
    }
  }, [showSource, sourceText, onChange]);

  // Wrap the selection in a <span> with text-transform: uppercase
  const applyUppercase = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!range.toString().trim()) return;

    const span = document.createElement('span');
    span.style.textTransform = 'uppercase';
    span.appendChild(range.extractContents());
    range.insertNode(span);

    const caret = document.createRange();
    caret.selectNodeContents(span);
    caret.collapse(false);
    sel.removeAllRanges();
    sel.addRange(caret);
    editor.focus();
    sync();
  }, [sync]);

  // Wrap selected block(s) in a CSS multi-column container (data-cols)
  const applyColumns = useCallback((columns: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    const startNode = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as Element)
      : range.startContainer.parentElement;
    const startBlock = startNode?.closest(BLOCK_SELECTOR) as HTMLElement | null;
    if (!startBlock) return;

    // Already inside a column wrapper → update or unwrap
    const existing = startBlock.closest('[data-cols]') as HTMLElement | null;
    if (existing) {
      if (columns <= 1) {
        while (existing.firstChild) {
          existing.parentElement?.insertBefore(existing.firstChild, existing);
        }
        existing.remove();
      } else {
        existing.style.columnCount = String(columns);
      }
      editor.focus();
      sync();
      return;
    }

    // Collect block elements that intersect the current selection
    const allBlocks = Array.from(editor.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
    const intersects = (b: HTMLElement) => {
      try {
        return range.intersectsNode(b) || (range.collapsed && b === startBlock);
      } catch {
        return false;
      }
    };
    let blocks = allBlocks.filter(intersects);
    if (blocks.length === 0) blocks = [startBlock];

    // Remove nested blocks so only top-level blocks move into the wrapper
    const topBlocks = blocks.filter(b => !blocks.some(o => o !== b && o.contains(b)));

    const wrapper = document.createElement('div');
    wrapper.dataset['cols'] = String(columns);
    wrapper.style.columnCount = String(columns);
    wrapper.style.columnGap = '2rem';

    topBlocks[0].before(wrapper);
    topBlocks.forEach(b => wrapper.appendChild(b));

    const caret = document.createRange();
    caret.selectNodeContents(wrapper);
    caret.collapse(false);
    sel.removeAllRanges();
    sel.addRange(caret);
    editor.focus();
    sync();
  }, [sync]);

  const toolbarBtn = 'p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all flex items-center justify-center';
  const toolbarBtnActive = (cond: boolean) => cond
    ? 'p-2 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
    : toolbarBtn;

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 sticky top-0">
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('bold')} className={toolbarBtnActive(document.queryCommandState?.('bold'))} title="Bold"><Bold size={16} /></button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('italic')} className={toolbarBtnActive(document.queryCommandState?.('italic'))} title="Italic"><Italic size={16} /></button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('underline')} className={toolbarBtnActive(document.queryCommandState?.('underline'))} title="Underline"><Underline size={16} /></button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('strikeThrough')} className={toolbarBtn} title="Strikethrough"><Strikethrough size={16} /></button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={applyUppercase} className={toolbarBtn} title="Uppercase"><Type size={16} /></button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('formatBlock', '<h2>')} className={toolbarBtn} title="Heading 2"><Heading2 size={16} /></button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('formatBlock', '<h3>')} className={toolbarBtn} title="Heading 3"><Heading3 size={16} /></button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('formatBlock', '<blockquote>')} className={toolbarBtn} title="Quote"><Quote size={16} /></button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('insertUnorderedList')} className={toolbarBtn} title="Bullet list"><List size={16} /></button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('insertOrderedList')} className={toolbarBtn} title="Numbered list"><ListOrdered size={16} /></button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('justifyLeft')} className={toolbarBtn} title="Align left"><AlignLeft size={16} /></button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('justifyCenter')} className={toolbarBtn} title="Align center"><AlignCenter size={16} /></button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('justifyRight')} className={toolbarBtn} title="Align right"><AlignRight size={16} /></button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyColumns(1)} className={toolbarBtn} title="Single column"><Columns size={16} /></button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyColumns(2)} className={toolbarBtn} title="Two columns"><Columns2 size={16} /></button>
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => applyColumns(3)} className={toolbarBtn} title="Three columns"><Columns3 size={16} /></button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => exec('removeFormat')} className={toolbarBtn} title="Clear formatting"><Eraser size={16} /></button>
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={toggleSource}
          className={showSource ? toolbarBtnActive(true) : toolbarBtn}
          title={showSource ? 'Back to visual editor' : 'Edit HTML source'}
        >
          {showSource ? <Eye size={16} /> : <Code2 size={16} />}
        </button>
      </div>

      {/* Editor body */}
      {showSource ? (
        <textarea
          value={sourceText}
          onChange={e => setSourceText(e.target.value)}
          rows={12}
          spellCheck={false}
          className="w-full px-4 py-3 font-mono text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none"
          placeholder="HTML source..."
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder || 'Enter passage content...'}
          className="rte-content rte-editor min-h-[220px] px-4 py-3 text-sm md:text-base text-gray-800 dark:text-gray-200 leading-relaxed focus:outline-none"
          dangerouslySetInnerHTML={{ __html: passageToHtml(value) }}
          onInput={sync}
          onBlur={sync}
        />
      )}
    </div>
  );
};
