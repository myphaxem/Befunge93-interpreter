import React from 'react';
import SampleCarousel from './SampleCarousel';

export default function Toolbar(props: {
  onRun: () => void;
  onStop: () => void;
  onStep: () => void;
  onShare: () => void;
  running: boolean;
  status: string;
  speed: number;
  setSpeed: (n: number) => void;
  inputQueue: string;
  setInputQueue: (s: string) => void;

  // 追加: ファイルアップロード
  onOpenFile: (content: string) => void;

  // 追加: 履歴機能
  onSaveSnapshot: () => void;
  onToggleHistory: () => void;

  // 追加: 入力モーダル
  onOpenInputModal: () => void;

  // 追加: モード切り替え
  mode: 'edit' | 'interpreter';
  onToggleMode: () => void;

  // 既存サンプルも残す（任意）
  loadSample: (name: string) => void;

  // 追加: seed入力
  seed: string;
  setSeed: (s: string) => void;
}) {
  const {
    onRun, onStop, onStep, onShare, running, status, speed, setSpeed,
    inputQueue, setInputQueue,
    onOpenFile,
    onSaveSnapshot, onToggleHistory,
    onOpenInputModal,
    mode, onToggleMode,
    loadSample,
    seed, setSeed
  } = props;

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onOpenFile(content);
      }
    };
    reader.readAsText(file);
    
    // Reset input so same file can be loaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="toolbar row">
      <button className="primary" onClick={onRun} disabled={running}>実行</button>
      <button onClick={onStep} disabled={running}>ステップ</button>
      <button onClick={onStop}>停止/リセット</button>
      <span className="badge">{status}</span>

      <button 
        onClick={onToggleMode} 
        className={`mode-badge ${mode}`}
        title={mode === 'edit' ? '編集モード（クリックでインタープリターモードへ）' : 'インタープリターモード（クリックで編集モードへ）'}
      >
        {mode === 'edit' ? '📝 Edit' : '▶️ Interp'}
      </button>

      <div className="row" style={{ marginLeft: 'auto' }}>
        <label>速度: </label>
        <input 
          type="range" 
          min={1} 
          max={10000} 
          value={speed} 
          onChange={e => setSpeed(parseInt(e.target.value))} 
          style={{ width: 150 }} 
          title={`${speed} ステップ/秒`}
          className="speed-slider"
        />
        <span className="speed-display">{speed}</span>

        <label>seed:</label>
        <input 
          type="text" 
          value={seed}
          onChange={e => setSeed(e.target.value)}
          placeholder="auto"
          style={{ 
            width: 80,
            fontFamily: 'ui-monospace, monospace',
            fontSize: 13,
            padding: '4px 8px',
            background: '#0f1216',
            border: '1px solid #2a2f36',
            borderRadius: 4,
            color: '#e8eaed'
          }}
          title="乱数シード（空欄で自動）"
        />

        <label>stdin:</label>
        <button 
          onClick={onOpenInputModal}
          style={{ 
            fontFamily: 'ui-monospace, monospace', 
            fontSize: 13,
            maxWidth: 180,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'left',
            padding: '4px 8px'
          }}
          title={inputQueue || '標準入力を編集...'}
        >
          {inputQueue ? inputQueue.replace(/\n/g, '⏎ ') : '（編集...）'}
        </button>

        <div className="hr" style={{ width: 1, height: 24 }} />

        {/* ファイルアップロード */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.bf,.bf93,.b,.b93"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button onClick={() => fileInputRef.current?.click()}>開く</button>

        {/* Swiper-based sample carousel */}
        <SampleCarousel onSelectSample={loadSample} />

        <div className="hr" style={{ width: 1, height: 24 }} />

        <button onClick={onSaveSnapshot}>保存</button>
        <button onClick={onToggleHistory}>履歴</button>
        <button onClick={onShare}>共有</button>
      </div>
    </div>
  );
}
