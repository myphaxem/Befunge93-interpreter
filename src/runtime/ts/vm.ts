import { GRID_H, GRID_W } from '../../app/state';

export type Output = { kind: 'text'; ch: string } | { kind: 'number'; value: number };
export type VMState = {
  halted: boolean;
  waitingInput: boolean;
  pc: { x: number; y: number; dx: number; dy: number };
  stack: number[];
  exitCode?: number;
  grid?: number[][]; // Include grid for dynamic updates
};

export class RNG {
  private seed: number;
  constructor(seed = 123456789) { this.seed = seed >>> 0; }
  next() { // xorshift32
    let x = this.seed;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.seed = x >>> 0; return this.seed / 0x100000000; }
  pick<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)]!; }
}

export class BefungeVM {
  grid: number[][]; // char codes
  gridW: number; // actual grid width
  gridH: number; // actual grid height
  stack: number[] = [];
  x = 0; y = 0; dx = 1; dy = 0;
  stringMode = false;
  halted = false;
  waitingInput = false;
  exitCode = 0;
  rng: RNG;
  inputQueue: number[] = []; // mix of ints and char codes（呼び出し側で制御）
  outputs: Output[] = [];

  constructor(src: string, seed = 1234) {
    // 受け取ったソースからタブ文字を「スペース1つ」に正規化
    const normalized = src.replace(/\t/g, ' ').replace(/\r\n?/g, '\n');

    const lines = normalized.split('\n');
    // Calculate actual grid dimensions based on content
    this.gridH = Math.max(lines.length, 1);
    this.gridW = Math.max(...lines.map(l => l.length), 1);
    
    // Initialize grid with spaces
    this.grid = Array.from({ length: this.gridH }, () => Array(this.gridW).fill(32));
    
    // Fill grid with source code
    for (let y = 0; y < lines.length; y++) {
      const line = lines[y]!;
      for (let x = 0; x < line.length; x++) {
        this.grid[y]![x] = line.charCodeAt(x);
      }
    }
    this.rng = new RNG(seed);
  }

  peek(n = 0) { const i = this.stack.length - 1 - n; return i >= 0 ? this.stack[i]! : 0; }
  pop() { return this.stack.pop() ?? 0; }
  push(v: number) { this.stack.push(Math.trunc(v)); } // 64-bit signed integer (JavaScript number)

  private move() {
    this.x = (this.x + this.dx + this.gridW) % this.gridW;
    this.y = (this.y + this.dy + this.gridH) % this.gridH;
  }

  private outText(ch: number) { this.outputs.push({ kind: 'text', ch: String.fromCharCode(ch & 0xff) }); }
  private outNum(v: number) { 
    this.outputs.push({ kind: 'number', value: Math.trunc(v) }); 
    this.outputs.push({ kind: 'text', ch: ' ' }); // space after number per reference implementation
  }

  private needInt(): number {
    // Skip leading whitespace and newlines
    while (this.inputQueue.length > 0) {
      const ch = this.inputQueue[0]!;
      // Check if it's whitespace (space=32, tab=9, newline=10, carriage return=13)
      if (ch === 32 || ch === 9 || ch === 10 || ch === 13) {
        this.inputQueue.shift();
      } else {
        break;
      }
    }
    
    if (this.inputQueue.length === 0) return -1; // EOF
    
    // Read digits (and optional minus sign)
    let numStr = '';
    let firstChar = this.inputQueue[0]!;
    
    // Check if first character is a minus sign or digit
    if (firstChar === 45) { // '-'
      numStr += String.fromCharCode(this.inputQueue.shift()!);
    }
    
    // Read digits
    let hasDigits = false;
    while (this.inputQueue.length > 0) {
      const ch = this.inputQueue[0]!;
      if (ch >= 48 && ch <= 57) { // '0'-'9'
        hasDigits = true;
        numStr += String.fromCharCode(this.inputQueue.shift()!);
      } else {
        break;
      }
    }
    
    // If no valid number was read, error
    if (!hasDigits) {
      this.halted = true;
      this.exitCode = 1;
      return -1;
    }
    
    return parseInt(numStr, 10);
  }

  private needChar(): number {
    if (this.inputQueue.length === 0) return -1; // EOF
    return this.inputQueue.shift()!;
  }

  step(): VMState {
    if (this.halted) return this.snapshot();
    this.waitingInput = false; this.outputs.length = 0;

    const ch = this.grid[this.y]![this.x]!; // current
    if (this.stringMode && ch !== 34 /* '"' */) {
      this.push(ch);
      this.move();
      return this.snapshot();
    }

    switch (ch) {
      // digits
      case 48: case 49: case 50: case 51: case 52:
      case 53: case 54: case 55: case 56: case 57: // '0'-'9'
        this.push(ch - 48); this.move(); break;

      // dirs
      case 62: this.dx = 1; this.dy = 0; this.move(); break; // '>'
      case 60: this.dx = -1; this.dy = 0; this.move(); break; // '<'
      case 94: this.dx = 0; this.dy = -1; this.move(); break; // '^'
      case 118: this.dx = 0; this.dy = 1; this.move(); break; // 'v'

      // arithmetic
      case 43: { const a = this.pop(), b = this.pop(); this.push(b + a); this.move(); break; } // +
      case 45: { const a = this.pop(), b = this.pop(); this.push(b - a); this.move(); break; } // -
      case 42: { const a = this.pop(), b = this.pop(); this.push(b * a); this.move(); break; } // *
      case 47: { // / - division with zero check (exit code 136 like AtCoder)
        const a = this.pop(), b = this.pop(); 
        if (a === 0) { 
          this.halted = true;
          this.exitCode = 136;
          console.error('Runtime error: division by zero (exit 136)'); 
          break; 
        }
        this.push(Math.trunc(b / a)); 
        this.move(); 
        break; 
      }
      case 37: { // % - modulo with zero check
        const a = this.pop(), b = this.pop(); 
        if (a === 0) { 
          this.halted = true;
          this.exitCode = 136;
          console.error('Runtime error: modulo by zero (exit 136)'); 
          break; 
        }
        this.push(b % a); 
        this.move(); 
        break; 
      }

      // stack ops
      case 58: { const a = this.peek(); this.push(a); this.move(); break; } // ':' dup
      case 92: { const a = this.pop(), b = this.pop(); this.push(a); this.push(b); this.move(); break; } // '\' swap
      case 36: { this.pop(); this.move(); break; } // '$' pop

      // logic
      case 33: { const a = this.pop(); this.push(a === 0 ? 1 : 0); this.move(); break; } // '!'
      case 96: { const a = this.pop(), b = this.pop(); this.push(b > a ? 1 : 0); this.move(); break; } // '`'

      // flow control
      case 95: { const a = this.pop(); this.dx = a === 0 ? 1 : -1; this.dy = 0; this.move(); break; } // '_'
      case 124:{ const a = this.pop(); this.dy = a === 0 ? 1 : -1; this.dx = 0; this.move(); break; } // '|'
      case 35: { this.move(); this.move(); break; } // '#'
      case 63: { const d = this.rng.pick([[1,0],[-1,0],[0,1],[0,-1]]); this.dx=d[0]!; this.dy=d[1]!; this.move(); break; } // '?'
      case 34: { this.stringMode = !this.stringMode; this.move(); break; } // '"'

      // I/O
      case 44: { const a = this.pop(); this.outText(a); this.move(); break; } // ','
      case 46: { const a = this.pop(); this.outNum(a); this.move(); break; } // '.'
      case 38: { // '&' int input
        const v = this.needInt();
        this.push(v); this.move(); break;
      }
      case 126: { // '~' char input
        const v = this.needChar();
        // Don't mask EOF (-1), otherwise mask to byte
        this.push(v === -1 ? -1 : v & 0xff); 
        this.move(); break;
      }

      // storage
      case 103: { // 'g'
        const y = this.pop(), x = this.pop();
        const xx = Math.trunc(x);
        const yy = Math.trunc(y);
        // Check if within valid Befunge-93 bounds [0,79]x[0,24]
        if (xx < 0 || xx > 79 || yy < 0 || yy > 24) {
          this.halted = true;
          this.exitCode = 1;
          console.error(`Runtime error: g command accessed out of bounds (${xx}, ${yy})`);
          break;
        }
        // Access within current grid or return space if beyond grid size
        if (yy < this.grid.length && xx < this.grid[yy]!.length) {
          this.push(this.grid[yy]![xx]!);
        } else {
          this.push(32); // space
        }
        this.move(); break;
      }
      case 112: { // 'p'
        const y = this.pop(), x = this.pop(), v = this.pop();
        const xx = Math.trunc(x);
        const yy = Math.trunc(y);
        // Check if within valid Befunge-93 bounds [0,79]x[0,24]
        if (xx < 0 || xx > 79 || yy < 0 || yy > 24) {
          this.halted = true;
          this.exitCode = 1;
          console.error(`Runtime error: p command accessed out of bounds (${xx}, ${yy})`);
          break;
        }
        // Expand grid if necessary
        while (this.grid.length <= yy) {
          this.grid.push(Array(80).fill(32));
        }
        while (this.grid[yy]!.length <= xx) {
          this.grid[yy]!.push(32);
        }
        this.grid[yy]![xx] = Math.trunc(v) & 0xff;
        this.move(); break;
      }

      case 64: { this.halted = true; break; } // '@'
      case 32: default: { this.move(); break; } // ' ' or others
    }

    return this.snapshot();
  }

  snapshot(): VMState {
    return {
      halted: this.halted,
      waitingInput: this.waitingInput,
      pc: { x: this.x, y: this.y, dx: this.dx, dy: this.dy },
      stack: [...this.stack],
      exitCode: this.exitCode,
      grid: this.grid.map(row => [...row]) // Deep copy grid
    };
  }
}
