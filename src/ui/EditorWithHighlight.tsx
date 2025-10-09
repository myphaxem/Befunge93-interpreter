import React, { useEffect, useRef, useState } from 'react';
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

export default function EditorWithHighlight({ code, onChange, pc, mode, breakpoints, onToggleBreakpoint }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});

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
      <SimpleEditor code={code} onChange={onChange} readOnly={false} />
    </div>
  );
}
