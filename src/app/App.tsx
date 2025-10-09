import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EditorWithHighlight from '../ui/EditorWithHighlight';
import Toolbar from '../ui/Toolbar';
import IOPanel from '../ui/IOPanel';
import StackPanel from '../ui/StackPanel';
import { DEFAULT_CODE } from './state';
import { decodeFromHash, encodeToHash } from '../runtime/ts/serializer';

// 履歴
import HistoryPanel from '../ui/HistoryPanel';
import { getLastOpen, getEntry, setCurrentUserId } from '../runtime/ts/history';

// 入力モーダル
import InputModal from '../ui/InputModal';

// Firebase Authentication
import LoginButton from '../ui/LoginButton';
import { 
  signInWithGithub, 
  signOut, 
  onAuthStateChange, 
  syncAppStateToFirestore,
  loadAppStateFromFirestore,
  loadHistoryFromFirestore,
  migrateLocalDataToFirestore,
  UserProfile
} from '../firebase/auth';
import { isFirebaseEnabled } from '../firebase/config';
import { compressToEncodedURIComponent as enc } from 'lz-string';

// @ts-ignore - Vite の worker ローダ
import RunnerWorker from '../workers/run.worker?worker';

// State persistence
const APP_STATE_KEY = 'befunge.app.state';
const APP_STATE_COOKIE = 'befunge_app_state_ts';

// Global user ID for sync
let globalUserId: string | null = null;

function saveAppState(code: string, inputQueue: string, mode: 'edit' | 'interpreter') {
  try {
    const state = { code, inputQueue, mode, timestamp: Date.now() };
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
    // Also set a cookie with just the timestamp for faster checking
    const d = new Date();
    d.setTime(d.getTime() + 365 * 24 * 60 * 60 * 1000);
    document.cookie = `${APP_STATE_COOKIE}=${Date.now()};expires=${d.toUTCString()};path=/;SameSite=Lax`;
    
    // Sync to Firestore if user is logged in
    if (globalUserId) {
      syncAppStateToFirestore(globalUserId, state).catch(err => {
        console.warn('Failed to sync app state to Firestore:', err);
      });
    }
  } catch (e) {
    console.warn('Failed to save app state', e);
  }
}

function loadAppState(): { code: string; inputQueue: string; mode: 'edit' | 'interpreter' } | null {
  try {
    const raw = localStorage.getItem(APP_STATE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    // Check if state is reasonably recent (within last 30 days)
    if (state.timestamp && Date.now() - state.timestamp < 30 * 24 * 60 * 60 * 1000) {
      return state;
    }
  } catch (e) {
    console.warn('Failed to load app state', e);
  }
  return null;
}

function parseInputQueue(input: string): number[] {
  // Convert all characters to their char codes
  // The & command will handle parsing integers from the stream
  const out: number[] = [];
  for (const ch of input) {
    out.push(ch.charCodeAt(0));
  }
  return out;
}

export default function App() {
  // Authentication state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Load saved app state
  const savedState = loadAppState();
  
  const [code, setCode] = useState<string>(() => {
    // URLハッシュ優先、次にlocalStorageの保存状態、最後に開いた履歴、なければデフォルト
    const byHash = decodeFromHash(location.hash);
    if (byHash != null) return byHash;
    if (savedState?.code) return savedState.code;
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
  const [inputQueueText, setInputQueueText] = useState(savedState?.inputQueue || '');
  const [mode, setMode] = useState<'edit' | 'interpreter'>(savedState?.mode || 'edit');
  const [runtimeGrid, setRuntimeGrid] = useState<number[][] | null>(null);
  const [seed, setSeed] = useState(''); // seed input (empty string means auto)

  // History tracking for step back (store last 100 states)
  const [stateHistory, setStateHistory] = useState<Array<{
    stack: number[];
    pc: { x: number; y: number };
    dir: { dx: number; dy: number };
    grid: number[][];
    textOut: string;
    numOut: number[];
    errorOut: string;
    status: string;
    exitCode: number | null;
    inputQueue: string;
  }>>([]);
  const maxHistorySize = 100;

  // 履歴パネル
  const [showHistory, setShowHistory] = useState(false);

  // 入力モーダル
  const [showInputModal, setShowInputModal] = useState(false);

  // Authentication listener
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        const userProfile: UserProfile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL
        };
        setUser(userProfile);
        globalUserId = firebaseUser.uid;
        setCurrentUserId(firebaseUser.uid);
        
        // Migrate local data to Firestore on first login
        if (!authInitialized) {
          await migrateLocalDataToFirestore(firebaseUser.uid);
          
          // Load data from Firestore
          const firestoreAppState = await loadAppStateFromFirestore(firebaseUser.uid);
          if (firestoreAppState) {
            setCode(firestoreAppState.code);
            setInputQueueText(firestoreAppState.inputQueue);
            setMode(firestoreAppState.mode);
          }
          
          const firestoreHistory = await loadHistoryFromFirestore(firebaseUser.uid);
          if (firestoreHistory) {
            // Update localStorage with Firestore data
            localStorage.setItem('befunge.history.v1', enc(JSON.stringify(firestoreHistory)));
          }
        }
      } else {
        setUser(null);
        globalUserId = null;
        setCurrentUserId(null);
      }
      setAuthInitialized(true);
    });
    
    return unsubscribe;
  }, [authInitialized]);

  const worker = useMemo(() => new RunnerWorker() as Worker, []);
  const rafRef = useRef<number | null>(null);
  const lastTickTime = useRef<number>(0);
  const accumulatedSteps = useRef<number>(0);

  // Initialize worker with code on mount
  useEffect(() => {
    worker.postMessage({ type: 'load', code, seed: getSeedValue(), inputQueue: parseInputQueue(inputQueueText) });
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
      
      // Save current state to history before updating (only in interpreter mode and not halted)
      if (mode === 'interpreter' && status !== 'halted' && !running) {
        setStateHistory(prev => {
          const newHistory = [...prev, {
            stack: [...stack],
            pc: { ...pc },
            dir: { ...dir },
            grid: runtimeGrid ? runtimeGrid.map(row => [...row]) : [],
            textOut,
            numOut: [...numOut],
            errorOut,
            status,
            exitCode,
            inputQueue: inputQueueText
          }];
          // Keep only last maxHistorySize states
          if (newHistory.length > maxHistorySize) {
            newHistory.shift();
          }
          return newHistory;
        });
      }
      
      if (Array.isArray(s.outputs)) {
        for (const o of s.outputs) {
          if (o.kind === 'text') setTextOut(prev => prev + o.ch);
          else setNumOut(prev => [...prev, o.value]);
        }
      }
      if (s.error) {
        setErrorOut(prev => prev + s.error + '\n');
      }
      if (s.grid) {
        setRuntimeGrid(s.grid);
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
  }, [worker, updateRunning, mode, status, running, stack, pc, dir, runtimeGrid, textOut, numOut, errorOut, exitCode]);

  useEffect(() => {
    // URL 共有対応
    const onHash = () => {
      const decoded = decodeFromHash(location.hash);
      if (decoded != null) setCode(decoded);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Handle window resize and orientation changes
  useEffect(() => {
    const handleResize = () => {
      // Force a re-render to recalculate layout
      // This is needed when screen size changes significantly (e.g., phone rotation)
      window.dispatchEvent(new Event('resize'));
    };
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', handleResize);
    
    // Also listen for resize events with debouncing
    let resizeTimeout: number;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(handleResize, 100);
    };
    window.addEventListener('resize', debouncedResize);
    
    return () => {
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Save app state periodically when code, inputQueue, or mode changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveAppState(code, inputQueueText, mode);
    }, 500); // Debounce by 500ms to avoid too frequent saves
    return () => clearTimeout(timeoutId);
  }, [code, inputQueueText, mode]);

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

  // Helper function to get seed value
  const getSeedValue = () => {
    if (seed.trim() === '') {
      return Date.now(); // Use current timestamp if empty
    }
    const parsed = parseInt(seed, 10);
    return isNaN(parsed) ? Date.now() : parsed;
  };

  const onRun = () => {
    setTextOut(''); 
    setNumOut([]); 
    setErrorOut('');
    setExitCode(null);
    updateRunning(true);
    setMode('interpreter');
    setStateHistory([]); // Clear history on new run
    worker.postMessage({ type: 'load', code, seed: getSeedValue(), inputQueue: parseInputQueue(inputQueueText) });
    startLoop();
  };
  const onStop = () => { 
    updateRunning(false); 
    stopLoop(); 
    worker.postMessage({ type: 'reset' }); 
    // Clear output states on reset
    setTextOut('');
    setNumOut([]);
    setErrorOut('');
    setExitCode(null);
    setStatus('idle');
  };
  const onPauseResume = () => {
    if (running) {
      // Pause
      updateRunning(false);
      stopLoop();
      setMode('interpreter');
    } else if (mode === 'interpreter' && status !== 'halted') {
      // Resume from pause
      updateRunning(true);
      startLoop();
    }
  };
  const onStep = () => { 
    if (mode === 'edit' || status === 'halted') {
      // Load current code when stepping from edit mode or after execution has halted
      worker.postMessage({ type: 'load', code, seed: getSeedValue(), inputQueue: parseInputQueue(inputQueueText) });
      // Clear output states when reloading
      setTextOut('');
      setNumOut([]);
      setErrorOut('');
      setExitCode(null);
      setStatus('idle');
      setStateHistory([]); // Clear history on new execution
    }
    setMode('interpreter');
    updateRunning(false); 
    stopLoop(); 
    worker.postMessage({ type: 'step' }); 
  };
  
  const onStepBack = () => {
    if (stateHistory.length === 0) return;
    
    // Pop the last state from history and restore it
    setStateHistory(prev => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const lastState = newHistory.pop()!;
      
      // Restore the state
      setStack(lastState.stack);
      setPC(lastState.pc);
      setDir(lastState.dir);
      setRuntimeGrid(lastState.grid);
      setTextOut(lastState.textOut);
      setNumOut(lastState.numOut);
      setErrorOut(lastState.errorOut);
      setStatus(lastState.status);
      setExitCode(lastState.exitCode);
      setInputQueueText(lastState.inputQueue);
      
      // Restore VM state in worker
      worker.postMessage({ 
        type: 'restore', 
        state: { 
          stack: lastState.stack, 
          pc: { 
            x: lastState.pc.x, 
            y: lastState.pc.y, 
            dx: lastState.dir.dx, 
            dy: lastState.dir.dy 
          }, 
          grid: lastState.grid,
          inputQueue: parseInputQueue(lastState.inputQueue)
        } 
      });
      
      return newHistory;
    });
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
    setMode(m => {
      const newMode = m === 'edit' ? 'interpreter' : 'edit';
      // When switching to interpreter mode, load the current edit code
      if (newMode === 'interpreter') {
        worker.postMessage({ type: 'load', code, seed: getSeedValue(), inputQueue: parseInputQueue(inputQueueText) });
      }
      return newMode;
    });
  };

  // 統合された出力文字列
  const combinedOutput = useMemo(() => {
    let result = textOut;
    if (numOut.length > 0) {
      result += numOut.join(' ');
    }
    return result;
  }, [textOut, numOut]);

  // Authentication handlers
  const handleLogin = async () => {
    try {
      await signInWithGithub();
    } catch (error) {
      console.error('Login failed:', error);
      alert('ログインに失敗しました。もう一度お試しください。');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      alert('ログアウトしました。');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="app">
      <div className="toolbar">
        <Toolbar
          onRun={onRun}
          onStop={onStop}
          onPauseResume={onPauseResume}
          onStep={onStep}
          onStepBack={onStepBack}
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

          seed={seed}
          setSeed={setSeed}

          loadSample={async (name: string) => {
            const map: Record<string, string> = { hello: 'hello_world.bf', cat: 'cat.bf', sieve: 'sieve.bf', random: 'random.bf' };
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
            <EditorWithHighlight 
              code={mode === 'interpreter' && runtimeGrid ? runtimeGrid.map(r => String.fromCharCode(...r)).join('\n') : code} 
              onChange={setCode} 
              pc={pc} 
              mode={mode} 
            />
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
        <div style={{ marginLeft: 'auto' }}>
          <LoginButton 
            user={user}
            onLogin={handleLogin}
            onLogout={handleLogout}
            isFirebaseEnabled={isFirebaseEnabled}
          />
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
