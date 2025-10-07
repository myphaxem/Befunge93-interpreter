import React from 'react';

export default function ConsoleView({ text, numbers }: { text: string; numbers: number[]; }) {
  return (
    <div className="panel" style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto' }}>
      <div className="row">
        <strong>出力</strong>
        <span className="badge">text</span>
      </div>
      <div className="console mono" aria-live="polite">{text || ' '}</div>
      <div style={{ marginTop: 8 }}>
        <div className="row"><span className="badge">numbers</span></div>
        <div className="console mono" style={{ maxHeight: 120 }}>{numbers.join(' ')}</div>
      </div>
    </div>
  );
}