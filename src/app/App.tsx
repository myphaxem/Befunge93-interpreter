import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EditorWithHighlight from '../ui/EditorWithHighlight';
import Toolbar from '../ui/Toolbar';
import IOPanel from '../ui/IOPanel';
import StackPanel from '../ui/StackPanel';
import { DEFAULT_CODE } from './state';
import { decodeFromHash, encodeToHash } from '../runtime/ts/serializer';

// 履歴
import HistoryPanel from '../ui/HistoryPanel';
import { getLastOpen, getEntry } from '../runtime/ts/history';

// 入力モーダル
import InputModal from '../ui/InputModal';

// @ts-ignore - Vite の worker ローダ
import RunnerWorker from '../workers/run.worker?worker';

function parseInputQueue(input: string): number[] {
  // 入力文字列をそのまま charCode に変換
  // すべての文字（スペース、改行含む）を保持
  const out: number[] = [];
  for (const ch of input) {
    out.push(ch.charCodeAt(0));
  }
  return out;
}

export default function App() {
  const [code, setCode] = useState<string>(() => {
    // URLハッシュ優先、次に最後に開いた履歴、なければデフォルト
    const byHash = decodeFromHash(location.hash);
    if (byHash != null) return byHash;
    const last = getLastOpen();
    if (last) {
      const e = getEntry(last);
      if (e?.code) return e.code;
    }
    return DEFAULT_CODE;
  });

  const [textOut, setTextOut] = useState('');
  const [numOut, setNumOut] = useState<number[]>([]);
  const [errorOut, setErrorOut] = useState('');
  const [stack, setStack] = useState<number[]>([]);
  const [pc, setPC] = useState({ x: 0, y: 0 });
  const [dir, setDir] = useState({ dx: 1, dy: 0 });
  const [status, setStatus] = useState('idle');
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(running);
  const [speed, setSpeed] = useState(2000);
  const speedRef = useRef(2000);
  const [inputQueueText, setInputQueueText] = useState('');
  const [mode, setMode] = useState<'edit' | 'interpreter'>('edit');

  // 履歴パネル
  const [showHistory, setShowHistory] = useState(false);

  // 入力モーダル
  const [showInputModal, setShowInputModal] = useState(false);

  const worker = useMemo(() => new RunnerWorker() as Worker, []);
  const rafRef = useRef<number | null>(null);
  const lastTickTime = useRef<number>(0);
  const accumulatedSteps = useRef<number>(0);

  // Initialize worker with code on mount
  useEffect(() => {
    worker.postMessage({ type: 'load', code, inputQueue: parseInputQueue(inputQueueText) });
  }, [worker]);

  const updateRunning = useCallback((next: boolean) => {
    runningRef.current = next;
    setRunning(next);
  }, []);

  const updateSpeed = useCallback((next: number) => {
    speedRef.current = next;
    setSpeed(next);
  }, []);

  useEffect(() => {
    function onMsg(e: MessageEvent<any>) {
      const s = e.data;
      if (!s) return;
      if (Array.isArray(s.outputs)) {
        for (const o of s.outputs) {
          if (o.kind === 'text') setTextOut(prev => prev + o.ch);
          else setNumOut(prev => [...prev, o.value]);
        }
      }
      if (s.error) {
        setErrorOut(prev => prev + s.error + '\n');
      }
      setStack(s.stack ?? []);
      setPC({ x: s.pc?.x ?? 0, y: s.pc?.y ?? 0 });
      setDir({ dx: s.pc?.dx ?? 1, dy: s.pc?.dy ?? 0 });
      if (s.halted) { 
        setStatus('halted'); 
        setExitCode(s.exitCode ?? 0);
        updateRunning(false); 
        stopLoop(); 
      }
      else if (s.waitingInput) { setStatus('waiting-input'); updateRunning(false); stopLoop(); }
      else setStatus(runningRef.current ? 'running' : 'idle');
    }
    worker.addEventListener('message', onMsg);
    return () => { worker.removeEventListener('message', onMsg); };
  }, [worker, updateRunning]);

  useEffect(() => {
    // URL 共有対応
    const onHash = () => {
      const decoded = decodeFromHash(location.hash);
      if (decoded != null) setCode(decoded);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const startLoop = () => {
    if (rafRef.current != null) return;
    lastTickTime.current = performance.now();
    accumulatedSteps.current = 0;
    const tick = () => {
      const now = performance.now();
      const deltaTime = (now - lastTickTime.current) / 1000; // Convert to seconds
      
      // Calculate how many steps to run based on elapsed time and desired speed
      // Accumulate fractional steps to handle slow speeds (e.g., 1 step/sec)
      accumulatedSteps.current += speedRef.current * deltaTime;
      const stepsToRun = Math.floor(accumulatedSteps.current);
      
      if (stepsToRun > 0) {
        worker.postMessage({ type: 'run', steps: stepsToRun });
        accumulatedSteps.current -= stepsToRun;
        lastTickTime.current = now;
      }
      
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };
  const stopLoop = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    worker.postMessage({ type: 'stop' });
  };

  const onRun = () => {
    setTextOut(''); 
    setNumOut([]); 
    setErrorOut('');
    setExitCode(null);
    updateRunning(true);
    setMode('interpreter');
    worker.postMessage({ type: 'load', code, inputQueue: parseInputQueue(inputQueueText) });
    startLoop();
  };
  const onStop = () => { 
    updateRunning(false); 
    stopLoop(); 
    worker.postMessage({ type: 'reset' }); 
  };
  const onStep = () => { 
    setMode('interpreter');
    updateRunning(false); 
    stopLoop(); 
    worker.postMessage({ type: 'step' }); 
  };
  const onShare = () => { const h = encodeToHash(code); history.replaceState(null, '', h); navigator.clipboard?.writeText(location.href); alert('共有URLをクリップボードにコピーしました\n' + location.href); };

  // ファイル名から読み込み
  const onOpenFile = (content: string) => {
    setCode(content);
  };

  // 履歴
  const onSaveSnapshot = () => {
    setShowHistory(true); // パネルから「＋保存」で現在のコードを保存できます
  };
  const onToggleHistory = () => setShowHistory(v => !v);

  // 入力モーダル
  const onOpenInputModal = () => setShowInputModal(true);
  const onSaveInput = (newInput: string) => {
    setInputQueueText(newInput);
  };

  // モード切り替え
  const toggleMode = () => {
    setMode(m => m === 'edit' ? 'interpreter' : 'edit');
  };

  // 統合された出力文字列
  const combinedOutput = useMemo(() => {
    let result = textOut;
    if (numOut.length > 0) {
      result += numOut.join(' ');
    }
    return result;
  }, [textOut, numOut]);

  return (
    <div className="app">
      <div className="toolbar">
        <Toolbar
          onRun={onRun}
          onStop={onStop}
          onStep={onStep}
          onShare={onShare}
          running={running}
          status={status}
          speed={speed}
          setSpeed={updateSpeed}
          inputQueue={inputQueueText}
          setInputQueue={setInputQueueText}

          onOpenFile={onOpenFile}

          onSaveSnapshot={onSaveSnapshot}
          onToggleHistory={onToggleHistory}

          onOpenInputModal={onOpenInputModal}

          mode={mode}
          onToggleMode={toggleMode}

          loadSample={async (name: string) => {
            const map: Record<string, string> = { hello: 'hello_world.bf', cat: 'cat.bf', sieve: 'sieve.bf' };
            const file = map[name]; if (!file) return;
            try {
              const res = await fetch(`./samples/${file}`);
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const contentType = res.headers.get('content-type');
              // Ensure we're not getting HTML when we expect a text file
              if (contentType && contentType.includes('text/html')) {
                throw new Error('Received HTML instead of .bf file');
              }
              const txt = await res.text();
              setCode(txt);
            } catch (e: any) {
              alert(`サンプル読み込みに失敗しました: ${file}\n${e?.message ?? e}`);
            }
          }}
        />
      </div>

      <div className="main-content">
        <div className="editor-section">
          <div className="editor-container">
            <EditorWithHighlight code={code} onChange={setCode} pc={pc} mode={mode} />
          </div>
        </div>

        <div className="io-section">
          {/* Stack at top */}
          <StackPanel stack={stack} />
          
          {/* Input and Output side by side */}
          <div style={{ display: 'flex', gap: 0 }}>
            <IOPanel title="📥 入力 (stdin)" content={inputQueueText} autoScroll={false} />
            <IOPanel title="📤 出力 (stdout)" content={combinedOutput} />
          </div>
          
          {/* Exit code and Error side by side */}
          <div style={{ display: 'flex', gap: 0 }}>
            <div className="io-panel" style={{ flex: 1 }}>
              <div className="io-header">
                <span>終了コード</span>
              </div>
              <div className="io-content">
                {exitCode !== null ? (
                  <span className={`badge ${exitCode === 0 ? 'ok' : 'err'}`}>{exitCode}</span>
                ) : (
                  <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>(未終了)</span>
                )}
              </div>
            </div>
            <IOPanel title="⚠️ エラー出力 (stderr)" content={errorOut} />
          </div>
        </div>
      </div>

      <div className="status-bar">
        <div>
          状態: <span className={`badge ${status === 'halted' ? 'ok' : status === 'waiting-input' ? 'err' : ''}`}>{status}</span>
        </div>
        <div>
          PC: ({pc.x}, {pc.y}) | 方向: [{dir.dx}, {dir.dy}]
        </div>
      </div>

      {/* 履歴モーダル */}
      <HistoryPanel
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        currentCode={code}
        onLoadCode={(c) => setCode(c)}
      />

      {/* 入力モーダル */}
      <InputModal
        visible={showInputModal}
        onClose={() => setShowInputModal(false)}
        inputQueue={inputQueueText}
        onSave={onSaveInput}
      />
    </div>
  );
}
