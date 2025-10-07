import React, { useEffect, useRef } from 'react';

type Props = {
  title: string;
  content: string;
  autoScroll?: boolean;
};

export default function IOPanel({ title, content, autoScroll = true }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, autoScroll]);

  return (
    <div className="io-panel">
      <div className="io-header">
        <span>{title}</span>
      </div>
      <div className="io-content" ref={contentRef}>
        {content}
      </div>
    </div>
  );
}
