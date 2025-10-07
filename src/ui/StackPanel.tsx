import React, { useEffect, useRef } from 'react';

type Props = {
  stack: number[];
};

export default function StackPanel({ stack }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to the end (rightmost/newest item)
    if (contentRef.current) {
      contentRef.current.scrollLeft = contentRef.current.scrollWidth;
    }
  }, [stack]);

  return (
    <div className="io-panel">
      <div className="io-header">
        <span>スタック (末尾=トップ)</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>長さ: {stack.length}</span>
      </div>
      <div className="stack-content" ref={contentRef}>
        {stack.map((v, i) => (
          <div className="stack-item" key={i} title={`char: ${String.fromCharCode(v & 0xff)}`}>
            {v}
          </div>
        ))}
      </div>
    </div>
  );
}
