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

function saveAppState(code: string, inputQueue: string, mode: 'edit' | 'interpreter', breakpoints: Set<string>) {
  try {
    const state = { 
      code, 
      inputQueue, 
      mode, 
      breakpoints: Array.from(breakpoints),
      timestamp: Date.now() 
    };
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

function loadAppState(): { code: string; inputQueue: string; mode: 'edit' | 'interpreter'; breakpoints?: string[] } | null {
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
  const [errorOut, setErrorOut] = useState('');
  const textOutRef = useRef('');
  const errorOutRef = useRef('');
  const isRestoringRef = useRef(false); // Flag to prevent history saving during restore
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

  // Breakpoints - stored as a Set of "x,y" strings, loaded from savedState
  const [breakpoints, setBreakpoints] = useState<Set<string>>(() => {
    if (savedState?.breakpoints && Array.isArray(savedState.breakpoints)) {
      return new Set(savedState.breakpoints);
    }
    return new Set();
  });

  // History tracking for step back (store last 10000 states)
  const [stateHistory, setStateHistory] = useState<Array<{
    stack: number[];
    pc: { x: number; y: number };
    dir: { dx: number; dy: number };
    grid: number[][];
    textOut: string;
    errorOut: string;
    status: string;
    exitCode: number | null;
    inputQueue: number[]; // Store actual VM input queue, not UI text
    stringMode: boolean;
    rngSeed: number;
    halted: boolean;
    waitingInput: boolean;
  }>>([]);
  const maxHistorySize = 10000;

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
      
      // Process outputs and update textOut/errorOut
      if (Array.isArray(s.outputs)) {
        for (const o of s.outputs) {
          if (o.kind === 'text') {
            textOutRef.current += o.ch;
          } else {
            // For numbers, append the number followed by a space (already done in VM)
            textOutRef.current += o.value.toString();
          }
        }
        setTextOut(textOutRef.current);
      }
      if (s.error) {
        errorOutRef.current += s.error + '\n';
        setErrorOut(errorOutRef.current);
      }
      
      // Update other state
      if (s.grid) {
        setRuntimeGrid(s.grid);
      }
      setStack(s.stack ?? []);
      setPC({ x: s.pc?.x ?? 0, y: s.pc?.y ?? 0 });
      setDir({ dx: s.pc?.dx ?? 1, dy: s.pc?.dy ?? 0 });
      
      // Determine status
      const currentStatus = s.halted ? 'halted' : (s.waitingInput ? 'waiting-input' : (runningRef.current ? 'running' : 'idle'));
      
      // Save state to history AFTER updating
      // Skip if we're currently restoring from history to avoid circular saves
      if (mode === 'interpreter' && !isRestoringRef.current) {
        setStateHistory(prev => {
          const newHistory = [...prev, {
            stack: s.stack ? [...s.stack] : [],
            pc: { x: s.pc?.x ?? 0, y: s.pc?.y ?? 0 },
            dir: { dx: s.pc?.dx ?? 1, dy: s.pc?.dy ?? 0 },
            grid: s.grid ? s.grid.map((row: number[]) => [...row]) : [],
            textOut: textOutRef.current,
            errorOut: errorOutRef.current,
            status: currentStatus,
            exitCode: s.exitCode ?? null,
            inputQueue: s.inputQueue ? [...s.inputQueue] : [],
            stringMode: s.stringMode ?? false,
            rngSeed: s.rngSeed ?? 1234,
            halted: s.halted ?? false,
            waitingInput: s.waitingInput ?? false
          }];
          // Keep only last maxHistorySize states
          if (newHistory.length > maxHistorySize) {
            newHistory.shift();
          }
          return newHistory;
        });
      }
      
      // Update status state
      if (s.halted) { 
        setStatus('halted'); 
        setExitCode(s.exitCode ?? 0);
        updateRunning(false); 
        stopLoop(); 
      }
      else if (s.waitingInput) { setStatus('waiting-input'); updateRunning(false); stopLoop(); }
      else setStatus(runningRef.current ? 'running' : 'idle');
      
      // Check for breakpoints
      if (mode === 'interpreter' && running && !s.halted && !s.waitingInput) {
        const bpKey = `${s.pc?.x ?? 0},${s.pc?.y ?? 0}`;
        if (breakpoints.has(bpKey)) {
          // Hit a breakpoint - pause execution
          updateRunning(false);
          stopLoop();
          setStatus('idle');
        }
      }
      
      // Clear restore flag after a short delay to allow any pending messages to be processed
      if (isRestoringRef.current) {
        // Use a timeout to ensure all restore-related messages are processed
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 100);
      }
    }
    worker.addEventListener('message', onMsg);
    return () => { worker.removeEventListener('message', onMsg); };
  }, [worker, updateRunning, mode, status, running, stack, pc, dir, runtimeGrid, textOut, errorOut, exitCode, breakpoints]);

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

  // Save app state periodically when code, inputQueue, mode, or breakpoints change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveAppState(code, inputQueueText, mode, breakpoints);
    }, 500); // Debounce by 500ms to avoid too frequent saves
    return () => clearTimeout(timeoutId);
  }, [code, inputQueueText, mode, breakpoints]);

  const startLoop = () => {
    if (rafRef.current != null) return;
    lastTickTime.current = performance.now();
    accumulatedSteps.current = 0;
    const tick = () => {
      const now = performance.now();
      const deltaTime = (now - lastTickTime.current) / 1000; // Convert to seconds
      lastTickTime.current = now;
      
      // Calculate how many steps to run based on elapsed time and desired speed
      // Accumulate fractional steps to handle slow speeds (e.g., 1 step/sec)
      accumulatedSteps.current += speedRef.current * deltaTime;
      const stepsToRun = Math.floor(accumulatedSteps.current);
      
      if (stepsToRun > 0) {
        worker.postMessage({ type: 'run', steps: stepsToRun });
        accumulatedSteps.current -= stepsToRun;
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
    textOutRef.current = '';
    errorOutRef.current = '';
    setTextOut(''); 
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
    textOutRef.current = '';
    errorOutRef.current = '';
    setTextOut('');
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
      textOutRef.current = '';
      errorOutRef.current = '';
      setTextOut('');
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
    if (stateHistory.length < 1) {
      return;
    }
    
    // Stop execution first for safety
    updateRunning(false);
    stopLoop();
    
    // Set flag to prevent history saving during restore
    isRestoringRef.current = true;
    
    // Pop state(s) from history until we find one that's different from current state
    // This handles cases where the last saved state is the same as the current displayed state
    setStateHistory(prev => {
      if (prev.length < 1) return prev;
      const newHistory = [...prev];
      
      // Get current state for comparison
      const currentPC = `${pc.x},${pc.y}`;
      const currentStackSize = stack.length;
      
      // Pop until we find a different state (or run out of history)
      let previousState = null;
      while (newHistory.length > 0) {
        previousState = newHistory.pop()!;
        const historyPC = `${previousState.pc.x},${previousState.pc.y}`;
        const historyStackSize = previousState.stack.length;
        
        // If this state is different from current, use it
        if (historyPC !== currentPC || historyStackSize !== currentStackSize) {
          break;
        }
        // Otherwise, keep popping (this state is same as current, skip it)
        previousState = null;
      }
      
      // If we found a valid previous state, restore it
      if (previousState) {
        // Restore the state
        setStack(previousState.stack);
        setPC(previousState.pc);
        setDir(previousState.dir);
        setRuntimeGrid(previousState.grid);
        setTextOut(previousState.textOut);
        textOutRef.current = previousState.textOut;
        setErrorOut(previousState.errorOut);
        errorOutRef.current = previousState.errorOut;
        setStatus(previousState.status);
        setExitCode(previousState.exitCode);
        // Don't change inputQueueText (it's for user editing), keep it as is
        
        // Restore VM state in worker with all necessary fields
        worker.postMessage({ 
          type: 'restore', 
          state: { 
            stack: previousState.stack, 
            pc: { 
              x: previousState.pc.x, 
              y: previousState.pc.y, 
              dx: previousState.dir.dx, 
              dy: previousState.dir.dy 
            }, 
            grid: previousState.grid,
            inputQueue: previousState.inputQueue, // Use actual VM input queue from history
            stringMode: previousState.stringMode,
            rngSeed: previousState.rngSeed,
            halted: previousState.halted,
            waitingInput: previousState.waitingInput
          } 
        });
      } else {
        // No different state found, reset the flag
        isRestoringRef.current = false;
      }
      
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

  // Toggle breakpoint handler
  const onToggleBreakpoint = (x: number, y: number) => {
    setBreakpoints(prev => {
      const newBreakpoints = new Set(prev);
      const key = `${x},${y}`;
      if (newBreakpoints.has(key)) {
        newBreakpoints.delete(key);
      } else {
        newBreakpoints.add(key);
      }
      return newBreakpoints;
    });
  };

  // 統合された出力文字列
  const combinedOutput = useMemo(() => {
    return textOut;
  }, [textOut]);

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
              breakpoints={breakpoints}
              onToggleBreakpoint={onToggleBreakpoint}
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
