import React, { useEffect, useRef, useState, useMemo } from 'react';
import SimpleEditor from '../editor/SimpleEditor';
import BefungeGrid from './BefungeGrid';

type Props = {
  code: string;
  onChange: (v: string) => void;
  pc: { x: number; y: number };
  mode: 'edit' | 'interpreter';
  breakpoints?: Set<string>;
  onToggleBreakpoint?: (x: number, y: number) => void;
};

// Get color for a Befunge character based on its type
function getCharColor(ch: string): string {
  const code = ch.charCodeAt(0);
  
  // Numbers (0-9)
  if (code >= 48 && code <= 57) return '#5bd19a';
  // Direction commands (>, <, ^, v)
  if (code === 62 || code === 60 || code === 94 || code === 118) return '#ff9d66';
  // Conditional directions (_, |, ?)
  if (code === 95 || code === 124 || code === 63) return '#ff9d66';
  // String mode (")
  if (code === 34) return '#c792ea';
  // I/O operations (. , & ~)
  if (code === 46 || code === 44 || code === 38 || code === 126) return '#7cc4ff';
  // Stack operations (+, -, *, /, %, :, \, $)
  if (code === 43 || code === 45 || code === 42 || code === 47 || code === 37 || 
      code === 58 || code === 92 || code === 36) return '#ffcb6b';
  // Logical operations (`, !)
  if (code === 96 || code === 33) return '#ffcb6b';
  // Grid operations (p, g)
  if (code === 112 || code === 103) return '#f07178';
  // Control flow (#, @)
  if (code === 35 || code === 64) return '#c792ea';
  // Default
  return 'var(--fg)';
}

export default function EditorWithHighlight({ code, onChange, pc, mode, breakpoints, onToggleBreakpoint }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});
  const preRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Generate syntax-highlighted HTML for edit mode
  const highlightedCode = useMemo(() => {
    return code.split('\n').map((line, lineIdx) => {
      const chars = line.split('').map((ch, charIdx) => {
        return `<span style="color: ${getCharColor(ch)}">${ch === ' ' ? '\u00A0' : ch.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`;
      }).join('');
      return chars || '\u00A0'; // Use non-breaking space for empty lines
    }).join('\n');
  }, [code]);

  useEffect(() => {
    if (mode !== 'interpreter' || !containerRef.current) {
      setHighlightStyle({ display: 'none' });
      return;
    }

    // Calculate character position
    // SimpleEditor uses line height and character width without line number gutter
    const lineHeight = 22; // Line height at font-size 16px
    const charWidth = 9.6; // Approximate character width for monospace font
    
    const top = pc.y * lineHeight + 10; // 10px for padding
    const left = pc.x * charWidth + 10; // 10px for padding

    setHighlightStyle({
      display: 'block',
      top: `${top}px`,
      left: `${left}px`,
      width: `${charWidth}px`,
      height: `${lineHeight}px`,
    });
  }, [pc, mode]);

  // Sync scroll position between textarea and syntax highlighting background
  useEffect(() => {
    if (mode !== 'edit') return;

    const handleScroll = (e: Event) => {
      const textarea = e.target as HTMLTextAreaElement;
      if (preRef.current) {
        preRef.current.scrollTop = textarea.scrollTop;
        preRef.current.scrollLeft = textarea.scrollLeft;
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('scroll', handleScroll);
      return () => textarea.removeEventListener('scroll', handleScroll);
    }
  }, [mode]);

  // Use grid view in interpreter mode with syntax highlighting
  // In edit mode, show the simple editor (plain text)
  if (mode === 'interpreter') {
    return (
      <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
        <BefungeGrid 
          code={code} 
          pc={pc} 
          breakpoints={breakpoints} 
          onToggleBreakpoint={onToggleBreakpoint}
          mode={mode}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Syntax highlighting background */}
      {mode === 'edit' && (
        <pre
          ref={preRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            margin: 0,
            padding: '10px',
            fontFamily: 'ui-monospace, monospace',
            fontSize: '16px',
            lineHeight: '22px',
            whiteSpace: 'pre',
            overflowWrap: 'normal',
            wordBreak: 'normal',
            overflow: 'auto',
            pointerEvents: 'none',
            background: '#1e1e1e',
            color: 'var(--fg)',
            zIndex: 1
          }}
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      )}
      {/* Editor on top */}
      <div style={{ position: 'relative', zIndex: 2, width: '100%', height: '100%' }}>
        <SimpleEditor 
          code={code} 
          onChange={onChange} 
          readOnly={false}
          className={mode === 'edit' ? 'syntax-highlighted' : ''}
          textareaRef={textareaRef}
        />
      </div>
    </div>
  );
}
