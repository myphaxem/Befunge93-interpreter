import React from 'react';

export default function Toolbar(props: {
  onRun: () => void;
  onStop: () => void;
  onPauseResume: () => void;
  onStep: () => void;
  onStepBack: () => void;
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
    onRun, onStop, onPauseResume, onStep, onStepBack, onShare, running, status, speed, setSpeed,
    inputQueue, setInputQueue,
    onOpenFile,
    onSaveSnapshot, onToggleHistory,
    onOpenInputModal,
    mode, onToggleMode,
    loadSample,
    seed, setSeed
  } = props;

  const [sampleValue, setSampleValue] = React.useState('');
  const [menuExpanded, setMenuExpanded] = React.useState(false);
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
    <div className="toolbar">
      <div className="toolbar-main row">
        <button className="primary" onClick={onRun} disabled={running}>実行</button>
        <button onClick={onPauseResume} disabled={mode === 'edit'}>
          {running ? '⏸ 一時停止' : '▶ 再開'}
        </button>
        <button onClick={onStep} disabled={running}>ステップ</button>
        <button onClick={onStepBack} disabled={running || mode === 'edit'}>⏪ ステップ戻し</button>
        <button onClick={onStop}>停止/リセット</button>
        <span className="badge">{status}</span>

        <button 
          onClick={onToggleMode} 
          className={`mode-badge ${mode}`}
          title={mode === 'edit' ? '編集モード（クリックでインタープリターモードへ）' : 'インタープリターモード（クリックで編集モードへ）'}
        >
          {mode === 'edit' ? '📝 Edit' : '▶️ Interp'}
        </button>

        {/* Mobile menu toggle */}
        <button 
          className="menu-toggle"
          onClick={() => setMenuExpanded(!menuExpanded)}
          style={{
            marginLeft: 'auto',
            padding: '6px 12px',
            fontSize: 18
          }}
          title="メニューを表示/非表示"
        >
          {menuExpanded ? '✕' : '☰'}
        </button>

        {/* Desktop controls - hidden on mobile */}
        <div className="row toolbar-controls" style={{ marginLeft: 'auto' }}>
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
          <input
            type="number"
            min={1}
            max={10000}
            value={speed}
            onChange={e => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 1 && val <= 10000) {
                setSpeed(val);
              }
            }}
            style={{
              width: 60,
              fontFamily: 'ui-monospace, monospace',
              fontSize: 13,
              padding: '4px 8px',
              background: '#0f1216',
              border: '1px solid #2a2f36',
              borderRadius: 4,
              color: '#e8eaed',
              textAlign: 'right'
            }}
            title="速度を直接入力"
            className="speed-input"
          />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>ステップ/秒</span>

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
            <option value="random">random.bf</option>
          </select>

          <div className="hr" style={{ width: 1, height: 24 }} />

          <button onClick={onSaveSnapshot}>保存</button>
          <button onClick={onToggleHistory}>履歴</button>
          <button onClick={onShare}>共有</button>
        </div>
      </div>

      {/* Mobile expanded menu */}
      {menuExpanded && (
        <div className="toolbar-mobile-menu">
          <div className="row" style={{ marginBottom: 8 }}>
            <label>速度:</label>
            <input 
              type="range" 
              min={1} 
              max={10000} 
              value={speed} 
              onChange={e => setSpeed(parseInt(e.target.value))} 
              style={{ flex: 1, minWidth: 80 }} 
              title={`${speed} ステップ/秒`}
            />
            <input
              type="number"
              min={1}
              max={10000}
              value={speed}
              onChange={e => {
                const val = parseInt(e.target.value);
                if (!isNaN(val) && val >= 1 && val <= 10000) {
                  setSpeed(val);
                }
              }}
              style={{ 
                width: 60,
                fontFamily: 'ui-monospace, monospace',
                fontSize: 13,
                padding: '4px 8px',
                background: '#0f1216',
                border: '1px solid #2a2f36',
                borderRadius: 4,
                color: '#e8eaed',
                textAlign: 'right'
              }}
              title="速度を直接入力"
            />
          </div>

          <div className="row" style={{ marginBottom: 8 }}>
            <label>seed:</label>
            <input 
              type="text" 
              value={seed}
              onChange={e => setSeed(e.target.value)}
              placeholder="auto"
              style={{ 
                flex: 1,
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
          </div>

          <div className="row" style={{ marginBottom: 8 }}>
            <label>stdin:</label>
            <button 
              onClick={onOpenInputModal}
              style={{ 
                flex: 1,
                fontFamily: 'ui-monospace, monospace', 
                fontSize: 13,
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
          </div>

          <div className="row" style={{ marginBottom: 8, gap: 8 }}>
            <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1 }}>開く</button>
            <select 
              value={sampleValue} 
              onChange={(e) => {
                const val = e.target.value;
                setSampleValue(val);
                if (val) {
                  loadSample(val);
                  setTimeout(() => setSampleValue(''), 0);
                }
              }}
              style={{ flex: 1 }}
            >
              <option value="" disabled>サンプル...</option>
              <option value="hello">hello_world.bf</option>
              <option value="cat">cat.bf</option>
              <option value="sieve">sieve.bf</option>
              <option value="random">random.bf</option>
            </select>
          </div>

          <div className="row" style={{ gap: 8 }}>
            <button onClick={onSaveSnapshot} style={{ flex: 1 }}>保存</button>
            <button onClick={onToggleHistory} style={{ flex: 1 }}>履歴</button>
            <button onClick={onShare} style={{ flex: 1 }}>共有</button>
          </div>
        </div>
      )}
    </div>
  );
}
