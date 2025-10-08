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
        if (vm.outputs.length) {
          // flush バッファ（UI を更新しつつスムーズに）
          let error: string | undefined;
          if (s.exitCode === 136) error = 'Runtime error: division/modulo by zero';
          else if (s.exitCode === 1) error = 'Runtime error: p/g command out of bounds';
          // @ts-ignore
          (self as any).postMessage(toState(s, vm.outputs.splice(0), error));
        }
        if (s.halted || s.waitingInput || !running) break;
      }
      let error: string | undefined;
      if (vm.exitCode === 136) error = 'Runtime error: division/modulo by zero';
      else if (vm.exitCode === 1) error = 'Runtime error: p/g command out of bounds';
      // @ts-ignore
      (self as any).postMessage(toState(vm.snapshot(), vm.outputs.splice(0), error));
      break;
    }
    case 'stop': {
      running = false; break;
    }
  }
};