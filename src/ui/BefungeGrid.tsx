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
        justifyContent: 'center'
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
                  color: 'var(--fg)',
                  whiteSpace: 'pre',
                  transition: 'all 0.1s ease',
                  boxSizing: 'border-box'
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
