import React from 'react';

export default function StackView({ stack, pc, dir }: { stack: number[]; pc: {x:number;y:number}; dir: {dx:number;dy:number}; }) {
  return (
    <div className="panel" style={{ display: 'grid', gridTemplateRows: 'auto auto 1fr' }}>
      <div className="row"><strong>デバッガ</strong></div>
      <div className="row" style={{ gap: 16 }}>
        <div>PC: (<span className="mono">{pc.x}</span>, <span className="mono">{pc.y}</span>)</div>
        <div>方向: <span className="mono">[{dir.dx},{dir.dy}]</span></div>
      </div>
      <div style={{ marginTop: 8 }}>
        <div className="row"><span className="badge">スタック（末尾=トップ）</span></div>
        <div className="stack mono">
          {stack.length === 0 ? <div className="cell">(empty)</div> : stack.map((v, i) => (
            <div className="cell" key={i} title={String.fromCharCode((v & 0xff))}>{v}</div>
          ))}
        </div>
      </div>
    </div>
  );
}