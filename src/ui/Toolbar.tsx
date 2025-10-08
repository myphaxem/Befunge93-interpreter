import React from 'react';

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
}) {
  const {
    onRun, onStop, onStep, onShare, running, status, speed, setSpeed,
    inputQueue, setInputQueue,
    onOpenFile,
    onSaveSnapshot, onToggleHistory,
    onOpenInputModal,
    mode, onToggleMode,
    loadSample
  } = props;

  const [sampleValue, setSampleValue] = React.useState('');
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

        {/* 任意のサンプル選択も残す */}
        <select 
          value={sampleValue} 
          onChange={(e) => {
            const val = e.target.value;
            setSampleValue(val);
            if (val) {
              loadSample(val);
              // Reset to empty so same sample can be loaded again
              setTimeout(() => setSampleValue(''), 0);
            }
          }}
        >
          <option value="" disabled>サンプル...</option>
          <option value="hello">hello_world.bf</option>
          <option value="cat">cat.bf</option>
          <option value="sieve">sieve.bf</option>
        </select>

        <div className="hr" style={{ width: 1, height: 24 }} />

        <button onClick={onSaveSnapshot}>保存</button>
        <button onClick={onToggleHistory}>履歴</button>
        <button onClick={onShare}>共有</button>
      </div>
    </div>
  );
}
