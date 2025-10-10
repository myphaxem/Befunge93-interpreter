import React, { useMemo } from 'react';

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
  
  // Default color for other characters
  return 'inherit';
}

export default function SyntaxHighlightedEditor({ 
  code, 
  onChange, 
  readOnly = false 
}: { 
  code: string; 
  onChange: (v: string) => void; 
  readOnly?: boolean; 
}) {
  const highlightedLines = useMemo(() => {
    return code.split('\n').map(line => 
      line.split('').map(ch => ({
        char: ch,
        color: getCharColor(ch)
      }))
    );
  }, [code]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Syntax highlighting overlay */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          padding: '10px',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '16px',
          lineHeight: '22px',
          whiteSpace: 'pre',
          overflowWrap: 'normal',
          wordBreak: 'normal',
          color: 'transparent',
          zIndex: 1
        }}
      >
        {highlightedLines.map((line, i) => (
          <div key={i}>
            {line.map((item, j) => (
              <span key={j} style={{ color: item.color }}>
                {item.char}
              </span>
            ))}
            {'\n'}
          </div>
        ))}
      </div>
      
      {/* Textarea */}
      <textarea
        className="simple-editor"
        value={code}
        onChange={(e) => {
          const value = e.target.value;
          // Replace any tab characters with single space
          const normalized = value.replace(/\t/g, ' ');
          // Constrain to 80x25 grid
          const lines = normalized.split('\n').slice(0, 25);
          const constrained = lines.map(line => line.substring(0, 80)).join('\n');
          onChange(constrained);
        }}
        readOnly={readOnly}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        wrap="off"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          color: 'transparent',
          caretColor: 'var(--fg)',
          background: 'transparent',
          zIndex: 2
        }}
      />
    </div>
  );
}
