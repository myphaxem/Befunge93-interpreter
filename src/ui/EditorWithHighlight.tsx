import React, { useEffect, useRef, useState } from 'react';
import Editor from '../editor/Editor';
import BefungeGrid from './BefungeGrid';

type Props = {
  code: string;
  onChange: (v: string) => void;
  pc: { x: number; y: number };
  mode: 'edit' | 'interpreter';
};

export default function EditorWithHighlight({ code, onChange, pc, mode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (mode !== 'interpreter' || !containerRef.current) {
      setHighlightStyle({ display: 'none' });
      return;
    }

    // Calculate character position
    // Monaco uses line height and character width
    const lineHeight = 19; // Approximate line height at font-size 14px
    const charWidth = 8.4; // Approximate character width for monospace font
    
    const top = pc.y * lineHeight + 1;
    const left = pc.x * charWidth + 62; // 62px for line number gutter

    setHighlightStyle({
      display: 'block',
      top: `${top}px`,
      left: `${left}px`,
      width: `${charWidth}px`,
      height: `${lineHeight}px`,
    });
  }, [pc, mode]);

  // Use grid view in interpreter mode, Monaco editor in edit mode
  if (mode === 'interpreter') {
    return (
      <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
        <BefungeGrid code={code} pc={pc} />
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Editor code={code} onChange={onChange} readOnly={mode === 'interpreter'} />
      <div className="pc-highlight" style={highlightStyle} />
    </div>
  );
}
