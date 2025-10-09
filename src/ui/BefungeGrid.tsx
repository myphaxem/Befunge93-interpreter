import React, { useMemo } from 'react';

type Props = {
  code: string;
  pc: { x: number; y: number };
};

// Calculate grid dimensions based on outermost non-space characters
function calculateGridDimensions(code: string): { width: number; height: number; minX: number; minY: number } {
  const lines = code.split('\n');
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  lines.forEach((line, y) => {
    for (let x = 0; x < line.length; x++) {
      const ch = line[x];
      if (ch !== ' ') {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  });

  // If no non-space characters found, default to full code dimensions
  if (minX === Infinity) {
    minX = 0;
    maxX = Math.max(...lines.map(l => l.length)) - 1;
    minY = 0;
    maxY = lines.length - 1;
  }

  return {
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    minX,
    minY
  };
}

// Get color for a Befunge character based on its type
function getCharColor(ch: string): string {
  const code = ch.charCodeAt(0);
  
  // Numbers (0-9)
  if (code >= 48 && code <= 57) {
    return '#5bd19a'; // Green for numbers
  }
  
  // Direction commands (>, <, ^, v)
  if (code === 62 || code === 60 || code === 94 || code === 118) {
    return '#ff9d66'; // Orange for directions
  }
  
  // Conditional directions (_, |, ?)
  if (code === 95 || code === 124 || code === 63) {
    return '#ff9d66'; // Orange for conditional directions
  }
  
  // String mode (")
  if (code === 34) {
    return '#c792ea'; // Purple for string mode
  }
  
  // I/O operations (. , & ~)
  if (code === 46 || code === 44 || code === 38 || code === 126) {
    return '#7cc4ff'; // Blue for I/O
  }
  
  // Stack operations (+, -, *, /, %, :, \, $)
  if (code === 43 || code === 45 || code === 42 || code === 47 || code === 37 || 
      code === 58 || code === 92 || code === 36) {
    return '#ffcb6b'; // Yellow for arithmetic/stack
  }
  
  // Logical operations (`, !)
  if (code === 96 || code === 33) {
    return '#ffcb6b'; // Yellow for logical
  }
  
  // Grid operations (p, g)
  if (code === 112 || code === 103) {
    return '#f07178'; // Red for grid operations
  }
  
  // Control flow (#, @)
  if (code === 35 || code === 64) {
    return '#c792ea'; // Purple for control flow
  }
  
  // Space
  if (code === 32) {
    return '#9aa4af'; // Muted for space
  }
  
  // Default color for other characters
  return 'var(--fg)';
}

export default function BefungeGrid({ code, pc }: Props) {
  const { grid, dimensions } = useMemo(() => {
    const lines = code.split('\n');
    const dims = calculateGridDimensions(code);
    
    // Create grid data
    const gridData: string[][] = [];
    for (let y = dims.minY; y <= dims.minY + dims.height - 1; y++) {
      const row: string[] = [];
      const line = lines[y] || '';
      for (let x = dims.minX; x <= dims.minX + dims.width - 1; x++) {
        row.push(line[x] || ' ');
      }
      gridData.push(row);
    }
    
    return { grid: gridData, dimensions: dims };
  }, [code]);

  const cellSize = 32; // Size of each cell in pixels

  return (
    <div 
      style={{ 
        padding: '20px',
        overflow: 'auto',
        height: '100%',
        background: '#0a0b0d',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-start'
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${dimensions.width}, ${cellSize}px)`,
          gap: '1px',
          background: '#222',
          padding: '1px',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '14px'
        }}
      >
        {grid.map((row, y) =>
          row.map((ch, x) => {
            const actualX = x + dimensions.minX;
            const actualY = y + dimensions.minY;
            const isPC = actualX === pc.x && actualY === pc.y;
            
            return (
              <div
                key={`${y}-${x}`}
                style={{
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                  background: isPC ? 'rgba(124, 196, 255, 0.25)' : '#15181c',
                  border: isPC ? '2px solid var(--accent)' : '1px solid #2a2f36',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: getCharColor(ch),
                  whiteSpace: 'pre',
                  transition: 'all 0.1s ease',
                  boxSizing: 'border-box',
                  fontWeight: ch === ' ' ? 'normal' : '600'
                }}
              >
                {ch}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
