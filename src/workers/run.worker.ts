import { BefungeVM, Output } from '../runtime/ts/vm';

let vm: BefungeVM | null = null;
let running = false;

function toState(state: ReturnType<BefungeVM['snapshot']>, outputs: Output[], error?: string) {
  return { type: 'state', ...state, outputs, error };
}

type Msg =
  | { type: 'load'; code: string; seed?: number; inputQueue?: number[] }
  | { type: 'reset' }
  | { type: 'step' }
  | { type: 'run'; steps: number }
  | { type: 'provideInput'; values: number[] }
  | { type: 'restore'; state: { stack: number[]; pc: { x: number; y: number; dx: number; dy: number }; grid: number[][]; inputQueue: number[]; stringMode: boolean; rngSeed: number; halted: boolean; waitingInput: boolean } }
  | { type: 'stop' };

self.onmessage = (e: MessageEvent<Msg>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'load': {
      vm = new BefungeVM(msg.code, msg.seed ?? 1234);
      vm.inputQueue = [...(msg.inputQueue ?? [])];
      running = false;
      // @ts-ignore
      (self as any).postMessage(toState(vm.snapshot(), []));
      break;
    }
    case 'reset': {
      if (!vm) break;
      const code = vm.grid.map(r => String.fromCharCode(...r)).join('\n');
      const savedQueue = [...vm.inputQueue]; // preserve input queue
      vm = new BefungeVM(code);
      vm.inputQueue = savedQueue;
      running = false;
      // @ts-ignore
      (self as any).postMessage(toState(vm.snapshot(), []));
      break;
    }
    case 'provideInput': {
      if (!vm) break;
      vm.inputQueue.push(...msg.values);
      // @ts-ignore
      (self as any).postMessage(toState(vm.snapshot(), []));
      break;
    }
    case 'step': {
      if (!vm) break;
      const s = vm.step();
      const outs = vm.outputs.splice(0);
      let error: string | undefined;
      if (s.exitCode === 136) error = 'Runtime error: division/modulo by zero';
      else if (s.exitCode === 1) error = 'Runtime error: p/g command out of bounds';
      // @ts-ignore
      (self as any).postMessage(toState(s, outs, error));
      break;
    }
    case 'run': {
      if (!vm) break;
      running = true;
      let steps = msg.steps;
      while (steps-- > 0) {
        const s = vm.step();
        const outs = vm.outputs.splice(0);
        let error: string | undefined;
        if (s.exitCode === 136) error = 'Runtime error: division/modulo by zero';
        else if (s.exitCode === 1) error = 'Runtime error: p/g command out of bounds';
        // @ts-ignore
        // Send state after EVERY step so UI can save to history
        (self as any).postMessage(toState(s, outs, error));
        if (s.halted || s.waitingInput || !running) break;
      }
      break;
    }
    case 'stop': {
      running = false; break;
    }
    case 'restore': {
      if (!vm) break;
      // Restore VM state from history
      vm.stack = [...msg.state.stack];
      vm.x = msg.state.pc.x;
      vm.y = msg.state.pc.y;
      vm.dx = msg.state.pc.dx;
      vm.dy = msg.state.pc.dy;
      vm.grid = msg.state.grid.map(row => [...row]);
      vm.inputQueue = [...msg.state.inputQueue];
      vm.stringMode = msg.state.stringMode;
      vm.halted = msg.state.halted;
      vm.waitingInput = msg.state.waitingInput;
      vm.rng.setSeed(msg.state.rngSeed);
      running = false;
      // @ts-ignore
      (self as any).postMessage(toState(vm.snapshot(), []));
      break;
    }
  }
};